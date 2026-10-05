'use client';

import { useState, useEffect, useTransition, useMemo, useCallback } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarGroup,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Header } from '@/components/dashboard/header';
import { Filters } from '@/components/dashboard/filters';
import { AiInsights } from '@/components/dashboard/ai-insights';
import { WeatherOverview } from '@/components/dashboard/weather-overview';
import { InteractiveMap } from '@/components/dashboard/interactive-map';
import { DiseaseTrendsChart } from '@/components/dashboard/disease-trends-chart';
import { TemperatureTrendsChart } from '@/components/dashboard/temperature-trends-chart';
import { CorrelationChart } from '@/components/dashboard/correlation-chart';
import { WeatherTrendsChart } from '@/components/dashboard/weather-trends-chart';
import { CorrelationStrength } from '@/components/dashboard/correlation-strength';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPinned, Activity, Download, HelpCircle, CalendarClock, CloudSun, FileSpreadsheet, Share2 } from 'lucide-react';
import {
  regions,
  diseases,
  findRegion,
  findDisease,
  getChartData,
  getDailyMapData,
  getTemperatureChartData,
  getCorrelationChartData,
  getWeatherTrendData,
  getCorrelationStats,
  getKpiData,
  getRecords,
  recordsToCsv,
} from '@/lib/data';
import type { WeatherData } from '@/lib/weather';
import { getWeatherAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Hero } from '@/components/dashboard/hero';
import { Logo } from '@/components/dashboard/logo';
import type { ArchivedSummary, AiSummary, FilterSet, ParseSearchQueryOutput } from '@/lib/types';
import { format, subMonths, startOfMonth, parseISO, isValid } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ThemeToggle } from '@/components/dashboard/theme-toggle';
import { AiSummaryArchive } from '@/components/dashboard/ai-summary-archive';
import { Walkthrough } from '@/components/dashboard/walkthrough';
import { TimelineControls } from '@/components/dashboard/timeline-controls';
import { DiseaseInfo } from '@/components/dashboard/disease-info';
import { NaturalLanguageSearch } from '@/components/dashboard/natural-language-search';

const tourSteps = [
  {
    title: 'Welcome to ClimIntel!',
    description: 'This quick tour walks through the dashboard. Use the buttons to move between steps.',
  },
  {
    title: 'Step 1: The Filters',
    description: 'In the left sidebar, pick a city, a disease and a date. Every chart updates instantly. You can also click a city on the map.',
  },
  {
    title: 'Step 2: AI Insight Generator',
    description: 'Below the filters, the AI summarises the weather and case figures for your selection and suggests public health actions.',
  },
  {
    title: 'Step 3: Main Dashboard View',
    description: 'Key metrics, current weather, the map, disease and weather trends, and how strongly each weather factor tracked cases.',
  },
  {
    title: 'Step 4: Compare, Forecast & Export',
    description: 'Toggle Compare to put two cities or diseases side by side, and Forecast to see a 7-day projection. Export the view as a PDF or the data as CSV, or copy a share link.',
  },
  {
    title: 'Step 5: Archive Your Insights',
    description: 'Save AI insights to the archive to review and compare later. You are all set!',
  },
];

const DEFAULT_A: FilterSet = { regionId: 'delhi', diseaseId: 'dengue', date: null };
const DEFAULT_B: FilterSet = { regionId: 'mumbai', diseaseId: 'dengue', date: null };

const validRegion = (id: string | null) => (id && findRegion(id) ? id : null);
const validDisease = (id: string | null) => (id && findDisease(id) ? id : null);

// All disease and weather series are computed locally from the simulation.
const derive = (f: FilterSet) =>
  f.date
    ? {
        chart: getChartData(f.regionId, f.diseaseId, f.date),
        temperature: getTemperatureChartData(f.regionId, f.date),
        correlation: getCorrelationChartData(f.regionId, f.diseaseId, f.date),
        weatherTrend: getWeatherTrendData(f.regionId, f.date),
        correlationStats: getCorrelationStats(f.regionId, f.diseaseId, f.date),
        kpi: getKpiData(f.regionId, f.diseaseId, f.date),
      }
    : null;

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function DashboardPage() {
  const [filters, setFilters] = useState<FilterSet>(DEFAULT_A);
  const [filtersB, setFiltersB] = useState<FilterSet>(DEFAULT_B);
  const [comparisonMode, setComparisonMode] = useState(false);

  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isWeatherLoading, startWeatherTransition] = useTransition();
  const [weatherDataB, setWeatherDataB] = useState<WeatherData | null>(null);
  const [isWeatherLoadingB, startWeatherTransitionB] = useTransition();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { toast } = useToast();

  const [showForecast, setShowForecast] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [currentSummary, setCurrentSummary] = useState<AiSummary | null>(null);
  const [archivedSummaries, setArchivedSummaries] = useState<ArchivedSummary[]>([]);

  const [isTourOpen, setIsTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  const [timelineMonths, setTimelineMonths] = useState<Date[]>([]);
  const [timelineIndex, setTimelineIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const [isHydrated, setIsHydrated] = useState(false);

  // Restore saved archives, the tour flag and any filters from a shared link.
  useEffect(() => {
    try {
      const storedArchives = localStorage.getItem('climintel-archives');
      if (storedArchives) setArchivedSummaries(JSON.parse(storedArchives));
      if (localStorage.getItem('climintel-tour-completed') !== 'true') setIsTourOpen(true);
    } catch (error) {
      console.error('Failed to read localStorage', error);
    }

    const pastMonths = Array.from({ length: 12 }).map((_, i) => startOfMonth(subMonths(new Date(), i))).reverse();
    setTimelineMonths(pastMonths);

    const params = new URLSearchParams(window.location.search);
    const linkedMonth = params.get('month') ? parseISO(`${params.get('month')}-01`) : null;
    const linkedIndex = linkedMonth && isValid(linkedMonth) ? pastMonths.findIndex((m) => m.getTime() === linkedMonth.getTime()) : -1;
    setTimelineIndex(linkedIndex >= 0 ? linkedIndex : pastMonths.length - 1);

    setFilters((prev) => ({
      ...prev,
      regionId: validRegion(params.get('region')) ?? prev.regionId,
      diseaseId: validDisease(params.get('disease')) ?? prev.diseaseId,
    }));
    if (params.get('compare') === '1') {
      setComparisonMode(true);
      setFiltersB((prev) => ({
        ...prev,
        regionId: validRegion(params.get('regionB')) ?? prev.regionId,
        diseaseId: validDisease(params.get('diseaseB')) ?? prev.diseaseId,
      }));
    }
    setIsHydrated(true);
  }, []);

  // The timeline drives the date of both filter sets.
  useEffect(() => {
    const month = timelineMonths[timelineIndex];
    if (month) {
      setFilters((prev) => ({ ...prev, date: month }));
      setFiltersB((prev) => ({ ...prev, date: month }));
      setCurrentSummary(null);
    }
  }, [timelineIndex, timelineMonths]);

  const fetchWeather = useCallback(
    (regionId: string, setData: (d: WeatherData | null) => void, start: React.TransitionStartFunction) => {
      start(async () => {
        const result = await getWeatherAction({ regionId });
        if (!result.ok) {
          toast({ variant: 'destructive', title: 'Error Fetching Weather', description: result.error });
          setData(null);
        } else {
          setData(result.data);
        }
        setLastUpdated(new Date());
      });
    },
    [toast],
  );

  useEffect(() => {
    if (isHydrated) fetchWeather(filters.regionId, setWeatherData, startWeatherTransition);
  }, [filters.regionId, isHydrated, fetchWeather]);

  useEffect(() => {
    if (isHydrated && comparisonMode) fetchWeather(filtersB.regionId, setWeatherDataB, startWeatherTransitionB);
  }, [filtersB.regionId, comparisonMode, isHydrated, fetchWeather]);

  // Keep the address bar in sync so the current view can be bookmarked or shared.
  const shareUrl = useMemo(() => {
    if (!isHydrated || !filters.date) return '';
    const params = new URLSearchParams({ region: filters.regionId, disease: filters.diseaseId, month: format(filters.date, 'yyyy-MM') });
    if (comparisonMode) {
      params.set('compare', '1');
      params.set('regionB', filtersB.regionId);
      params.set('diseaseB', filtersB.diseaseId);
    }
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  }, [isHydrated, filters, filtersB, comparisonMode]);

  useEffect(() => {
    if (shareUrl) window.history.replaceState(null, '', shareUrl);
  }, [shareUrl]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setTimelineIndex((prev) => {
        if (prev >= timelineMonths.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1500);
    return () => clearInterval(timer);
  }, [isPlaying, timelineMonths.length]);


  const seriesA = useMemo(() => derive(filters), [filters]);
  const seriesB = useMemo(() => (comparisonMode ? derive(filtersB) : null), [filtersB, comparisonMode]);
  const mapData = useMemo(() => (filters.date ? getDailyMapData(filters.diseaseId, filters.date) : []), [filters.diseaseId, filters.date]);

  const handleFilterChange = (newFilters: Partial<FilterSet>, set: 'A' | 'B' = 'A') => {
    const setFiltersFn = set === 'A' ? setFilters : setFiltersB;
    const { date, ...rest } = newFilters;

    if (date) {
      // A date inside the last 12 months moves the shared timeline; anything older is applied directly.
      const matchingIndex = timelineMonths.findIndex((m) => m.getTime() === startOfMonth(date).getTime());
      if (matchingIndex !== -1 && matchingIndex !== timelineIndex) {
        setTimelineIndex(matchingIndex);
        if (Object.keys(rest).length > 0) setFiltersFn((prev) => ({ ...prev, ...rest }));
      } else {
        setFiltersFn((prev) => ({ ...prev, ...rest, date }));
      }
    } else {
      setFiltersFn((prev) => ({ ...prev, ...rest }));
    }
    if (set === 'A') setCurrentSummary(null);
  };

  const handleSearch = (parsed: Partial<ParseSearchQueryOutput>) => {
    const next: Partial<FilterSet> = {};
    if (validRegion(parsed.regionId ?? null)) next.regionId = parsed.regionId;
    if (validDisease(parsed.diseaseId ?? null)) next.diseaseId = parsed.diseaseId;
    if (parsed.date && isValid(parseISO(parsed.date))) next.date = parseISO(parsed.date);
    handleFilterChange(next);
  };

  const handleTimelineChange = (index: number) => {
    setIsPlaying(false);
    setTimelineIndex(index);
  };

  const regionName = (id: string) => findRegion(id)?.name ?? 'India';
  const diseaseName = (id: string) => findDisease(id)?.name ?? 'Disease';
  const selectedRegionName = regionName(filters.regionId);
  const selectedDiseaseName = diseaseName(filters.diseaseId);
  const selectedRegionNameB = regionName(filtersB.regionId);
  const selectedDiseaseNameB = diseaseName(filtersB.diseaseId);
  const selectedDisease = findDisease(filters.diseaseId);

  const handleArchiveSummary = () => {
    if (!currentSummary?.summary || !filters.date) return;
    const newArchive: ArchivedSummary = {
      id: new Date().toISOString(),
      summary: currentSummary.summary,
      recommendations: currentSummary.recommendations,
      regionName: `${selectedRegionName} · ${selectedDiseaseName}`,
      date: filters.date.toISOString(),
      archivedAt: new Date().toISOString(),
    };
    const updated = [newArchive, ...archivedSummaries];
    setArchivedSummaries(updated);
    setCurrentSummary(null);
    try {
      localStorage.setItem('climintel-archives', JSON.stringify(updated));
      toast({ title: 'Insight saved', description: 'Find it under Saved insights.' });
    } catch (error) {
      console.error('Failed to save archives to localStorage', error);
      toast({ variant: 'destructive', title: 'Insight not saved', description: 'Browser storage is full or blocked. Free some space and try again.' });
    }
  };

  const handlePdfExport = async () => {
    if (!filters.date) return;
    const exportContainer = document.getElementById('export-container');
    if (!exportContainer) {
      toast({ variant: 'destructive', title: 'Export Failed', description: 'Could not find the dashboard content to export.' });
      return;
    }

    setIsExporting(true);
    document.body.classList.add('is-exporting');
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      const canvas = await html2canvas(exportContainer, { scale: 1.5, useCORS: true, logging: false, backgroundColor: null });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pdfHeight = pdfWidth / (canvas.width / canvas.height);

      let heightLeft = pdfHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`climintel-${filters.regionId}-${filters.diseaseId}-${format(filters.date, 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error('PDF Export Error: ', error);
      toast({ variant: 'destructive', title: 'Export Failed', description: 'An error occurred while generating the PDF. Please try again.' });
    } finally {
      document.body.classList.remove('is-exporting');
      setIsExporting(false);
    }
  };

  const handleCsvExport = () => {
    if (!filters.date) return;
    const sets = [{ region: selectedRegionName, disease: selectedDiseaseName, records: getRecords(filters.regionId, filters.diseaseId, filters.date) }];
    if (comparisonMode && filtersB.date) {
      sets.push({ region: selectedRegionNameB, disease: selectedDiseaseNameB, records: getRecords(filtersB.regionId, filtersB.diseaseId, filtersB.date) });
    }
    const filename = `climintel-${filters.regionId}-${filters.diseaseId}-${format(filters.date, 'yyyy-MM-dd')}.csv`;
    downloadFile(filename, recordsToCsv(sets), 'text/csv;charset=utf-8');
    toast({ title: 'Data Exported', description: `${filename} downloaded.` });
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: 'Link Copied', description: 'Anyone with the link sees this exact view.' });
    } catch {
      toast({ title: 'Copy this link', description: shareUrl });
    }
  };

  const handleCloseTour = () => {
    setIsTourOpen(false);
    setTourStep(0);
    try {
      localStorage.setItem('climintel-tour-completed', 'true');
    } catch (error) {
      console.error('Failed to save tour status to localStorage', error);
    }
  };

  const combinedChartData = useMemo(
    () =>
      (seriesA?.chart ?? []).map((d, i) => ({
        ...d,
        compareCases: seriesB?.chart[i]?.cases ?? null,
        compareForecastCases: seriesB?.chart[i]?.forecastCases ?? null,
      })),
    [seriesA, seriesB],
  );

  const combinedTemperatureData = useMemo(
    () =>
      (seriesA?.temperature ?? []).map((d, i) => ({
        ...d,
        compareTemp: seriesB?.temperature[i]?.temperature ?? null,
        compareForecastTemp: seriesB?.temperature[i]?.forecastTemp ?? null,
      })),
    [seriesA, seriesB],
  );

  const combinedCorrelationData = useMemo(
    () =>
      (seriesA?.correlation ?? []).map((d, i) => ({
        ...d,
        compareCases: seriesB?.correlation[i]?.cases ?? null,
        compareTemperature: seriesB?.correlation[i]?.temperature ?? null,
      })),
    [seriesA, seriesB],
  );

  if (!isHydrated || !filters.date || !seriesA) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <Logo className="h-12 w-12 animate-pulse" />
        <p className="font-headline text-lg">Loading the dashboard</p>
      </div>
    );
  }

  const labelA = `${selectedRegionName} ${selectedDiseaseName}`;
  const labelB = `${selectedRegionNameB} ${selectedDiseaseNameB}`;

  return (
    <div className="min-h-screen flex flex-col">
      <Walkthrough isOpen={isTourOpen} onClose={handleCloseTour} step={tourStep} setStep={setTourStep} steps={tourSteps} />
      <SidebarProvider>
        <Sidebar collapsible="icon" className="print:hidden">
          <SidebarHeader>
            <div className="flex items-center gap-2.5 p-2">
              <Logo className="h-8 w-8 shrink-0" />
              <div className="group-data-[collapsible=icon]:hidden">
                <h1 className="font-headline text-xl font-bold leading-none">ClimIntel</h1>
                <p className="mt-1 text-xs text-muted-foreground">Climate and disease, India</p>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarGroup>
                  <Filters
                    title={comparisonMode ? 'First view' : 'What to look at'}
                    regions={regions}
                    diseases={diseases}
                    filters={filters}
                    onFilterChange={(f) => handleFilterChange(f, 'A')}
                  />
                  {comparisonMode && (
                    <>
                      <Separator className="my-4" />
                      <Filters
                        title="Compare with"
                        regions={regions}
                        diseases={diseases}
                        filters={filtersB}
                        onFilterChange={(f) => handleFilterChange(f, 'B')}
                      />
                    </>
                  )}
                </SidebarGroup>
              </SidebarMenuItem>
              <Separator />
              <SidebarMenuItem>
                <SidebarGroup>
                  <AiInsights
                    regionId={filters.regionId}
                    diseaseId={filters.diseaseId}
                    date={filters.date}
                    onSummaryGenerated={setCurrentSummary}
                  />
                </SidebarGroup>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <SidebarInset className="min-w-0">
          <div id="export-container" className="flex-1 flex flex-col">
            <Header>
              <SidebarTrigger className="md:hidden print:hidden" />
              <div className="flex w-full flex-wrap items-center justify-between gap-3 print:hidden">
                <NaturalLanguageSearch regions={regions} diseases={diseases} onSearch={handleSearch} />
                <div className="glass flex flex-wrap items-center gap-1 rounded-full p-1">
                  <label className="flex cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 text-sm hover:bg-foreground/5">
                    <Switch id="compare-toggle" checked={comparisonMode} onCheckedChange={setComparisonMode} />
                    Compare
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 text-sm hover:bg-foreground/5">
                    <Switch id="forecast-toggle" checked={showForecast} onCheckedChange={setShowForecast} />
                    Forecast
                  </label>
                  <span className="mx-1 h-5 w-px bg-border/15" aria-hidden />
                  <Button onClick={handlePdfExport} variant="ghost" size="sm" className="rounded-full" disabled={isExporting}>
                    <Download className="mr-1.5 h-4 w-4" />
                    {isExporting ? 'Exporting…' : 'PDF'}
                  </Button>
                  <Button onClick={handleCsvExport} variant="ghost" size="sm" className="rounded-full">
                    <FileSpreadsheet className="mr-1.5 h-4 w-4" />
                    CSV
                  </Button>
                  <Button onClick={handleShare} variant="ghost" size="icon" className="h-9 w-9 rounded-full" title="Copy share link">
                    <Share2 className="h-4 w-4" />
                    <span className="sr-only">Copy share link</span>
                  </Button>
                  <Button onClick={() => { setTourStep(0); setIsTourOpen(true); }} variant="ghost" size="icon" className="h-9 w-9 rounded-full" title="Take the tour">
                    <HelpCircle className="h-4 w-4" />
                    <span className="sr-only">Take the tour</span>
                  </Button>
                  <ThemeToggle />
                </div>
              </div>
            </Header>
            <main id="dashboard-content" className="flex-1 space-y-5 p-4 pt-2 md:p-8 md:pt-2">
              <Hero
                diseaseName={selectedDiseaseName}
                regionName={selectedRegionName}
                date={filters.date}
                kpi={seriesA.kpi}
                compare={seriesB ? { diseaseName: selectedDiseaseNameB, regionName: selectedRegionNameB, kpi: seriesB.kpi } : undefined}
                points={mapData}
                selectedId={filters.regionId}
                compareId={comparisonMode ? filtersB.regionId : undefined}
                onSelect={(regionId) => handleFilterChange({ regionId }, 'A')}
              />

              <section className="glass flex flex-col gap-3 rounded-2xl px-5 py-4 sm:flex-row sm:items-center sm:gap-6 print:hidden" aria-label="Month">
                <p className="flex shrink-0 items-center gap-2 text-sm font-medium">
                  <CalendarClock className="h-4 w-4 text-muted-foreground" /> Month
                </p>
                <div className="min-w-0 flex-1">
                  <TimelineControls
                    months={timelineMonths.map((m) => format(m, 'MMM yyyy'))}
                    currentIndex={timelineIndex}
                    onIndexChange={handleTimelineChange}
                    isPlaying={isPlaying}
                    onTogglePlay={() => setIsPlaying(!isPlaying)}
                  />
                </div>
              </section>

              {comparisonMode && seriesB ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 [&>*]:min-w-0">
                  <WeatherOverview compact title={`Weather now in ${selectedRegionName}`} weatherData={weatherData} loading={isWeatherLoading} lastUpdated={lastUpdated} />
                  <WeatherOverview compact title={`Weather now in ${selectedRegionNameB}`} weatherData={weatherDataB} loading={isWeatherLoadingB} lastUpdated={lastUpdated} />
                </div>
              ) : (
                <WeatherOverview title={`Weather now in ${selectedRegionName}`} weatherData={weatherData} loading={isWeatherLoading} lastUpdated={lastUpdated} />
              )}

              <div className="grid gap-5 md:grid-cols-2 [&>*]:min-w-0">
                <Card className="print:hidden">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-headline">
                      <MapPinned className="h-5 w-5 text-muted-foreground" /> {selectedDiseaseName} by city on {format(filters.date, 'd MMM yyyy')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pl-2">
                    <InteractiveMap
                      data={mapData}
                      selectedId={filters.regionId}
                      compareId={comparisonMode ? filtersB.regionId : undefined}
                      onSelect={(regionId) => handleFilterChange({ regionId }, 'A')}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-headline">
                      <Activity className="h-5 w-5 text-muted-foreground" /> {comparisonMode ? 'Cases against temperature' : `${selectedDiseaseName} cases against temperature`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CorrelationChart data={combinedCorrelationData} comparisonMode={comparisonMode} seriesLabels={{ a: labelA, b: labelB }} isAnimationActive={!isExporting} />
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-5 md:grid-cols-2 [&>*]:min-w-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="font-headline">
                      {comparisonMode ? 'Daily cases' : `Daily ${selectedDiseaseName.toLowerCase()} cases in ${selectedRegionName}`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DiseaseTrendsChart data={combinedChartData} showForecast={showForecast} comparisonMode={comparisonMode} seriesLabels={{ a: labelA, b: labelB }} isAnimationActive={!isExporting} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="font-headline">
                      {comparisonMode ? 'Temperature' : `Temperature in ${selectedRegionName}`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TemperatureTrendsChart data={combinedTemperatureData} showForecast={showForecast} comparisonMode={comparisonMode} seriesLabels={{ a: selectedRegionName, b: selectedRegionNameB }} isAnimationActive={!isExporting} />
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-5 md:grid-cols-2 [&>*]:min-w-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-headline">
                      <CloudSun className="h-5 w-5 text-muted-foreground" /> {comparisonMode ? 'Humidity, rain and wind' : `Humidity, rain and wind in ${selectedRegionName}`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <WeatherTrendsChart
                      data={seriesA.weatherTrend}
                      compareData={seriesB?.weatherTrend}
                      showForecast={showForecast}
                      seriesLabels={{ a: selectedRegionName, b: selectedRegionNameB }}
                      isAnimationActive={!isExporting}
                    />
                  </CardContent>
                </Card>
                <CorrelationStrength
                  sets={[
                    { label: labelA, factors: seriesA.correlationStats },
                    ...(seriesB ? [{ label: labelB, factors: seriesB.correlationStats }] : []),
                  ]}
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2 [&>*]:min-w-0">
                <DiseaseInfo disease={selectedDisease} />
                <div className="print:hidden">
                  <AiSummaryArchive currentSummary={currentSummary} archivedSummaries={archivedSummaries} onArchive={handleArchiveSummary} />
                </div>
              </div>
            </main>
            <footer className="p-4 text-center text-sm text-muted-foreground print:hidden">
              © {new Date().getFullYear()} ClimIntel. Disease figures are simulated for demonstration and are not real surveillance data.
            </footer>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
