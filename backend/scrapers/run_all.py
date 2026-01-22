import subprocess
import time
from datetime import datetime
import os
import sys
import logging
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.mailer import send_email_report
from pymongo import MongoClient
from thefuzz import fuzz
from dotenv import load_dotenv

load_dotenv()

# Setup logging
log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'logs')
os.makedirs(log_dir, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(log_dir, f'scraper_{datetime.now().strftime("%Y%m%d")}.log')),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

SCRAPERS = [
    ("chittorgarh_scraper.py", "Chittorgarh"),
    ("groww_scraper.py", "Groww"),
    ("investorgain_scraper.py", "InvestorGain"),
    ("sptulsian_scraper.py", "SP Tulsian")
]

def find_duplicates(db):
    """
    Finds potential duplicate IPOs based on name similarity.
    Returns a list of tuples: (ipo1_doc, ipo2_doc, score)
    """
    ipos = list(db.ipos.find({}, {"ipo_name": 1, "_id": 1}))
    duplicates = []
    seen = set()

    for i in range(len(ipos)):
        for j in range(i + 1, len(ipos)):
            name1 = ipos[i].get("ipo_name", "").lower()
            name2 = ipos[j].get("ipo_name", "").lower()
            
            # Skip empty names
            if not name1 or not name2:
                continue
                
            # Skip if exact match (should remain acceptable) or if very different
            if name1 == name2: 
                continue

            score = fuzz.ratio(name1, name2)
            
            if score > 85: # Threshold for "Possible Duplicate"
                # Avoid listing A-B and B-A
                pair_key = tuple(sorted([str(ipos[i]["_id"]), str(ipos[j]["_id"])]))
                if pair_key not in seen:
                    duplicates.append({
                        "id1": str(ipos[i]["_id"]),
                        "name1": ipos[i]["ipo_name"],
                        "id2": str(ipos[j]["_id"]),
                        "name2": ipos[j]["ipo_name"],
                        "score": score
                    })
                    seen.add(pair_key)
    
    return duplicates

def run_scrapers():
    start_time = time.time()
    
    # 1. Run Scrapers
    report_lines = []
    report_lines.append(f"<h2>IPO Radar Scraper Report</h2>")
    report_lines.append(f"<p>Run initiated at: {time.strftime('%Y-%m-%d %H:%M:%S')}</p>")
    report_lines.append("<hr>")

    total_success = 0
    
    for script, name in SCRAPERS:
        print(f"🚀 Running {name} Scraper...")
        logger.info(f"Starting {name} scraper")
        report_lines.append(f"<h3>{name}</h3>")
        
        try:
            result = subprocess.run(
                ["python3", script], 
                capture_output=True, 
                text=True,
                check=False,
                timeout=300  # 5 minute timeout
            )
            output = result.stdout
            saved_count = output.count("✅ Saved") + output.count("✅ Updated")
            status_icon = "✅" if result.returncode == 0 else "❌"
            
            print(f"   {status_icon} Finished (Updates: {saved_count})")
            logger.info(f"{name} scraper completed with {saved_count} updates")
            
            report_lines.append(f"<p><strong>Status:</strong> {status_icon} (Exit Code: {result.returncode})</p>")
            report_lines.append(f"<p><strong>Records Updated:</strong> {saved_count}</p>")
            
            if result.stderr:
                logger.warning(f"{name} scraper stderr: {result.stderr[-500:]}")
                report_lines.append(f"<details><summary>Error Logs</summary><pre>{result.stderr[-500:]}</pre></details>")

            if result.returncode == 0:
                total_success += 1
            else:
                logger.error(f"{name} scraper failed with exit code {result.returncode}")

        except subprocess.TimeoutExpired:
            logger.error(f"{name} scraper timed out after 5 minutes")
            print(f"   ❌ Timeout: {name} took too long")
            report_lines.append(f"<p>❌ Timeout: Scraper exceeded 5 minutes</p>")
        except Exception as e:
            logger.exception(f"{name} scraper critical failure: {e}")
            print(f"   ❌ Failed to launch: {e}")
            report_lines.append(f"<p>❌ Critical Failure: {str(e)}</p>")

    # 2. Check for Duplicates
    try:
        mongo_uri = os.getenv("MONGO_URI")
        if mongo_uri:
            client = MongoClient(mongo_uri, tlsAllowInvalidCertificates=True)
            db = client["ipo-radar"]
            duplicates = find_duplicates(db)
            
            if duplicates:
                report_lines.append("<hr>")
                report_lines.append(f"<h3>⚠️ Potential Duplicates Detected ({len(duplicates)})</h3>")
                report_lines.append("<ul>")
                
                base_url = "http://localhost:5001/api/merge" # Use backend endpoint for one-click merge
                
                for d in duplicates:
                    link = f"{base_url}?keep={d['id1']}&merge={d['id2']}"
                    link_reverse = f"{base_url}?keep={d['id2']}&merge={d['id1']}"
                    
                    report_lines.append(f"""
                        <li>
                            <strong>{d['name1']}</strong> vs <strong>{d['name2']}</strong> (Score: {d['score']})<br>
                            👉 <a href="{link}">Merge into '{d['name1']}'</a> | 
                            👉 <a href="{link_reverse}">Merge into '{d['name2']}'</a>
                        </li>
                    """)
                report_lines.append("</ul>")
            else:
                report_lines.append("<hr><p>✅ No duplicates found.</p>")
                
    except Exception as e:
        print(f"Error checking duplicates: {e}")
        report_lines.append(f"<p>⚠️ Error checking duplicates: {e}</p>")

    duration_total = time.time() - start_time
    report_lines.append("<hr>")
    report_lines.append(f"<p><strong>Total Duration:</strong> {duration_total:.2f} seconds</p>")
    
    # Send Email
    subject = f"IPO Radar Status: {total_success}/{len(SCRAPERS)} Success + {len(duplicates) if 'duplicates' in locals() else 0} Conflicts"
    body = "".join(report_lines)
    
    print("\n📧 Sending email report...")
    send_email_report(subject, body)
    
    # 3. Notify Subscribers
    print("\n🔔 Notifying Subscribers...")
    subprocess.run(["python3", "../notifications/notify_subscribers.py"], check=False)
    
    # 4. Send Admin Summary
    print("\n📊 Sending Admin Summary...")
    subprocess.run(["python3", "../notifications/notify_admin.py"], check=False)
    
    print("✅ Done.")

if __name__ == "__main__":
    run_scrapers()
