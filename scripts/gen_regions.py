"""Generate src/lib/regions.ts.

Combines city coordinates with the 90-city sample weather dataset in
scripts/data/, and stores each city's average weather from that sample as its
climate baseline.

Usage: python3 scripts/gen_regions.py scripts/data/sample-weather-nov-2023.json src/lib/regions.ts
"""
import json, re, statistics, sys

SAMPLE_JSON = sys.argv[1]
OUT = sys.argv[2]

sample = json.load(open(SAMPLE_JSON))

# Coordinates (lat, lng). The first 30 are the larger metros.
coords = {
    "Delhi": (28.6139, 77.2090), "Mumbai": (19.0760, 72.8777), "Bengaluru": (12.9716, 77.5946),
    "Kolkata": (22.5726, 88.3639), "Chennai": (13.0827, 80.2707), "Hyderabad": (17.3850, 78.4867),
    "Ahmedabad": (23.0225, 72.5714), "Pune": (18.5204, 73.8567), "Surat": (21.1702, 72.8311),
    "Jaipur": (26.9124, 75.7873), "Lucknow": (26.8467, 80.9462), "Kanpur": (26.4499, 80.3319),
    "Nagpur": (21.1458, 79.0882), "Indore": (22.7196, 75.8577), "Thane": (19.2183, 72.9781),
    "Bhopal": (23.2599, 77.4126), "Visakhapatnam": (17.6868, 83.2185), "Pimpri-Chinchwad": (18.6278, 73.8001),
    "Patna": (25.5941, 85.1376), "Vadodara": (22.3072, 73.1812), "Ghaziabad": (28.6692, 77.4538),
    "Ludhiana": (30.9010, 75.8573), "Agra": (27.1767, 78.0081), "Nashik": (19.9975, 73.7898),
    "Faridabad": (28.4089, 77.3178), "Meerut": (28.9845, 77.7064), "Rajkot": (22.3039, 70.8022),
    "Kalyan-Dombivli": (19.2430, 73.1325), "Vasai-Virar": (19.4739, 72.8093), "Varanasi": (25.3176, 82.9739),
    # Other cities in the sample
    "Agartala": (23.8315, 91.2868), "Ahmednagar": (19.0948, 74.7480), "Ajmer": (26.4499, 74.6399),
    "Aligarh": (27.8974, 78.0880), "Prayagraj": (25.4358, 81.8463), "Amravati": (20.9374, 77.7796),
    "Amritsar": (31.6340, 74.8723), "Aurangabad": (19.8762, 75.3433), "Bareilly": (28.3670, 79.4304),
    "Belagavi": (15.8497, 74.4977), "Bhiwandi": (19.2813, 73.0483), "Bhiwani": (28.7975, 76.1322),
    "Bhubaneswar": (20.2961, 85.8245), "Bihar Sharif": (25.1982, 85.5149), "Bikaner": (28.0229, 73.3119),
    "Bilaspur": (22.0797, 82.1409), "Cuttack": (20.4625, 85.8830), "Dehradun": (30.3165, 78.0322),
    "Dhanbad": (23.7957, 86.4304), "Durgapur": (23.5204, 87.3119), "Etawah": (26.7856, 79.0158),
    "Gandhinagar": (23.2156, 72.6369), "Guwahati": (26.1445, 91.7362), "Gwalior": (26.2183, 78.1828),
    "Howrah": (22.5958, 88.2636), "Jabalpur": (23.1815, 79.9864), "Jalandhar": (31.3260, 75.5762),
    "Jamnagar": (22.4707, 70.0577), "Jamshedpur": (22.8046, 86.2029), "Jodhpur": (26.2389, 73.0243),
    "Kochi": (9.9312, 76.2673), "Kolhapur": (16.7050, 74.2433), "Kollam": (8.8932, 76.6141),
    "Kota": (25.2138, 75.8648), "Kurnool": (15.8281, 78.0373), "Madurai": (9.9252, 78.1198),
    "Malegaon": (20.5579, 74.5089), "Mangaluru": (12.9141, 74.8560), "Moradabad": (28.8386, 78.7733),
    "Mysuru": (12.2958, 76.6394), "Navi Mumbai": (19.0330, 73.0297), "Nellore": (14.4426, 79.9865),
    "Noida": (28.5355, 77.3910), "Panipat": (29.3909, 76.9635), "Pathankot": (32.2643, 75.6421),
    "Puducherry": (11.9416, 79.8083), "Raipur": (21.2514, 81.6296), "Ranchi": (23.3441, 85.3096),
    "Rourkela": (22.2604, 84.8536), "Saharanpur": (29.9680, 77.5552), "Salem": (11.6643, 78.1460),
    "Satara": (17.6805, 74.0183), "Shimla": (31.1048, 77.1734), "Solapur": (17.6599, 75.9064),
    "Srinagar": (34.0837, 74.7973), "Thanjavur": (10.7870, 79.1378), "Thiruvananthapuram": (8.5241, 76.9366),
    "Tiruppur": (11.1085, 77.3411), "Udaipur": (24.5854, 73.7125), "Ujjain": (23.1765, 75.7885),
    "Vijayawada": (16.5062, 80.6480), "Warangal": (17.9689, 79.5941),
}

# Sample spellings -> display name
alias = {"Ludhiyana": "Ludhiana", "Allahabad": "Prayagraj"}

# Stable ids that predate the display-name change, so saved links keep working
legacy_ids = {"Bengaluru": "bangalore", "Kalyan-Dombivli": "kalyan-dombivali"}

# The 30 original cities are the larger metros; they get a bigger case-volume scale
metro_scale = {"Delhi": 1.25, "Mumbai": 1.9}
original = list(coords)[:30]

# Cities missing from the sample borrow the nearest sampled neighbour's baseline
borrow = {"Pimpri-Chinchwad": "Pune", "Vasai-Virar": "Mumbai"}

def slug(name):
    return legacy_ids.get(name) or re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")

baselines = {}
for raw, rows in sample.items():
    name = alias.get(raw, raw)
    baselines[name] = {
        "temp": round(statistics.mean(r["temperature"] for r in rows), 1),
        "humidity": round(statistics.mean(r["humidity"] for r in rows)),
        "precip": round(statistics.mean(r["precipitation"] for r in rows), 1),
        "wind": round(statistics.mean(r["windSpeed"] for r in rows), 1),
    }

missing = [n for n in coords if n not in baselines and n not in borrow]
unused = [n for n in baselines if n not in coords]
if missing or unused:
    sys.exit(f"mismatch: no baseline for {missing}; no coords for {unused}")

lines = []
for name in sorted(coords, key=str.lower):
    lat, lng = coords[name]
    b = baselines[borrow.get(name, name)]
    scale = metro_scale.get(name, 1.0 if name in original else 0.6)
    lines.append(
        f"  {{ id: '{slug(name)}', name: '{name}', lat: {lat}, lng: {lng}, scale: {scale}, "
        f"climate: {{ temp: {b['temp']}, humidity: {b['humidity']}, precip: {b['precip']}, wind: {b['wind']} }} }},"
    )

ts = f"""import type {{ Region }} from './types';

/**
 * {len(lines)} Indian cities.
 *
 * `climate` is each city's November baseline (average temperature in °C, relative
 * humidity in %, daily rainfall in mm and wind speed in km/h), taken from the
 * sample weather dataset in scripts/data/. `src/lib/climate.ts`
 * builds a seasonal, day-by-day weather series from it.
 *
 * `scale` sets the relative volume of simulated disease cases.
 *
 * Generated by scripts/gen_regions.py. Edit that script rather than this file.
 */
export const regions: Region[] = [
{chr(10).join(lines)}
];
"""
open(OUT, "w").write(ts)
print(f"wrote {len(lines)} regions")
