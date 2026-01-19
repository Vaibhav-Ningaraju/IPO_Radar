import requests
from bs4 import BeautifulSoup
from datetime import datetime
import json
import time
import re
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "https://www.chittorgarh.com"
LIST_URL = "https://www.chittorgarh.com/ipo/ipo_dashboard.asp"
HEADERS = {"User-Agent": "Mozilla/5.0"}
DELAY = 1.2

# MongoDB Connection
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = "ipo-radar"
COLLECTION_NAME = "ipos"

try:
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]
    # Create unique index on ipo_name to prevent duplicates
    collection.create_index("ipo_name", unique=True)
    print("✅ Connected to MongoDB")
except Exception as e:
    print("❌ MongoDB Connection Error:", e)
    client = None


def get_html(url):
    time.sleep(DELAY)
    r = requests.get(url, headers=HEADERS, timeout=15)
    r.raise_for_status()
    return r.text


# ---------------- STATUS LOGIC ----------------

def infer_status(row):
    cls = " ".join(row.get("class", []))
    badge = row.find("span", class_="badge")

    if "color-green" in cls:
        return "open"
    if "color-lightyellow" in cls:
        return "open"
    if badge and badge.text.strip() in ("O", "P"):
        return "open"

    return "closed"


# ---------------- GET IPO LINKS ----------------

def get_ipo_links():
    soup = BeautifulSoup(get_html(LIST_URL), "lxml")
    ipos = []
    seen = set()

    for a in soup.find_all("a", href=True):
        href = a["href"]

        # strict IPO URL match
        if not re.match(r"^/ipo/.+-ipo/\d+/?$", href):
            continue

        url = BASE_URL + href
        if url in seen:
            continue
        seen.add(url)

        row = a.find_parent("tr")
        status = infer_status(row) if row else "unknown"

        ipos.append({
            "url": url,
            "ipo_name": a.get_text(strip=True),
            "status": status
        })

    return ipos


# ---------------- SECTION EXTRACTOR ----------------

def extract_section(soup, keywords):
    for h2 in soup.find_all("h2"):
        text = h2.get_text(" ", strip=True).lower()
        if any(k.lower() in text for k in keywords):
            card = h2
            while card:
                if card.name == "div" and card.get("class") and "card" in " ".join(card.get("class")):
                    return card
                card = card.parent
    return None


# ---------------- SCRAPE IPO PAGE ----------------

SECTION_KEYS = {
    "ipo_details": ["IPO Details"],
    "ipo_timetable": ["IPO TimeTable", "IPO Timetable"],
    "ipo_objectives": ["IPO Objects", "Objects of the Issue"],
    "reservation": ["IPO Reservation"],
    "lot_size": ["IPO Lot Size"],
    "financials": ["Company Financials"],
    "kpi": ["Key Performance Indicator", "KPI"],
    "anchor_investors": ["IPO Anchor Investors"],
    "promoter_group": ["Promoter Group", "Promoters"]
}


def scrape_ipo(ipo):
    soup = BeautifulSoup(get_html(ipo["url"]), "lxml")

    raw_html = {k: None for k in SECTION_KEYS}
    values = {}

    for key, keywords in SECTION_KEYS.items():
        card = extract_section(soup, keywords)
        if card:
            raw_html[key] = str(card)

            for tr in card.find_all("tr"):
                tds = tr.find_all("td")
                if len(tds) >= 2:
                    k = tds[0].get_text(" ", strip=True).lower()
                    v = tds[1].get_text(" ", strip=True)
                    values[k] = v

    return {
        "url": ipo["url"],
        "ipo_name": ipo["ipo_name"],
        "status": ipo["status"],
        "values": values,
        "raw_html": raw_html,
        "updatedAt": datetime.now()
    }


# ---------------- MAIN ----------------

def main():
    if not client:
        print("❌ Aborting: No MongoDB connection")
        return

    ipos = get_ipo_links()
    print(f"Found {len(ipos)} IPOs")

    # Limit to top 20 for quick update
    ipos = ipos[:20]
    for i, ipo in enumerate(ipos, 1):
        print(f"[{i}/{len(ipos)}] Processing: {ipo['ipo_name']}")
        try:
            data = scrape_ipo(ipo)
            
            # Flatten 'values' to prevent overwriting other scraper data
            update_data = {}
            for k, v in data.items():
                if k == "values":
                    for vk, vv in v.items():
                        update_data[f"values.{vk}"] = vv
                else:
                    update_data[k] = v

            # Upsert into MongoDB
            collection.update_one(
                {"ipo_name": data["ipo_name"]},
                {"$set": update_data},
                upsert=True
            )
            print(f"   ✅ Saved to MongoDB")

        except Exception as e:
            print(f"   ❌ Error: {e}")

    print("\n✅ Scraper finished.")


if __name__ == "__main__":
    main()
