import os
import sys
from pymongo import MongoClient
from dotenv import load_dotenv
from datetime import datetime
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.mailer import send_email_report

load_dotenv()

def get_admin_email():
    """Get admin email from environment or use default"""
    return os.getenv("ADMIN_EMAIL", os.getenv("EMAIL_USER"))

def send_scraper_summary():
    """Send summary email about scraping results and potential duplicates"""
    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        print("❌ MONGO_URI not found.")
        return

    # Fix SSL issues with Python 3.13
    import certifi
    client = MongoClient(mongo_uri, tlsCAFile=certifi.where())
    db = client["ipo-radar"]
    ipos_collection = db["ipos"]

    # Get all IPOs
    all_ipos = list(ipos_collection.find())
    
    # Count by status
    open_count = len([ipo for ipo in all_ipos if ipo.get('status') == 'open'])
    upcoming_count = len([ipo for ipo in all_ipos if ipo.get('status') == 'upcoming'])
    closed_count = len([ipo for ipo in all_ipos if ipo.get('status') == 'closed'])
    
    # Detect potential duplicates (simple name similarity check)
    potential_duplicates = []
    seen = {}
    
    for ipo in all_ipos:
        name = ipo.get('ipo_name', '')
        # Create a simplified key for comparison
        simple_key = name.lower().replace('&', 'and').replace(' ', '').replace('-', '')
        
        if simple_key in seen:
            potential_duplicates.append({
                'existing': seen[simple_key],
                'duplicate': name,
                'existing_id': seen[simple_key + '_id'],
                'duplicate_id': str(ipo['_id'])
            })
        else:
            seen[simple_key] = name
            seen[simple_key + '_id'] = str(ipo['_id'])
    
    # Build email
    html_body = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 700px; margin: 0 auto; line-height: 1.6; color: #333;">
        <h2 style="color: #0f172a; border-bottom: 3px solid #2563eb; padding-bottom: 10px;">IPO Radar - Scraper Summary Report</h2>
        <p style="color: #64748b; font-size: 14px;">Generated: {datetime.now().strftime('%d %b %Y, %I:%M %p')}</p>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #0f172a;">Database Statistics</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; color: #64748b;">Total IPOs</td>
                    <td style="padding: 8px 0; font-weight: 600; text-align: right;">{len(all_ipos)}</td>
                </tr>
                <tr style="background-color: #dcfce7;">
                    <td style="padding: 8px 0; color: #166534;">Open Now</td>
                    <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #166534;">{open_count}</td>
                </tr>
                <tr style="background-color: #dbeafe;">
                    <td style="padding: 8px 0; color: #1e40af;">Upcoming</td>
                    <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #1e40af;">{upcoming_count}</td>
                </tr>
                <tr style="background-color: #f1f5f9;">
                    <td style="padding: 8px 0; color: #475569;">Closed</td>
                    <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #475569;">{closed_count}</td>
                </tr>
            </table>
        </div>
    """
    
    if potential_duplicates:
        html_body += f"""
        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #991b1b;">⚠️ Potential Duplicates Detected ({len(potential_duplicates)})</h3>
            <p style="font-size: 14px; color: #7f1d1d;">The following IPOs may be duplicates and require manual review:</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px;">
                <thead>
                    <tr style="background-color: #fee2e2;">
                        <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dc2626;">Existing Name</th>
                        <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dc2626;">Duplicate Name</th>
                        <th style="padding: 10px; text-align: center; border-bottom: 2px solid #dc2626;">Action</th>
                    </tr>
                </thead>
                <tbody>
        """
        
        for dup in potential_duplicates:
            merge_url = f"https://ipo-radar-j5o7.onrender.com/api/merge?keep={dup['existing_id']}&merge={dup['duplicate_id']}"
            html_body += f"""
                    <tr style="border-bottom: 1px solid #fecaca;">
                        <td style="padding: 10px;">{dup['existing']}</td>
                        <td style="padding: 10px; color: #dc2626; font-weight: 500;">{dup['duplicate']}</td>
                        <td style="padding: 10px; text-align: center;">
                            <a href="{merge_url}" style="display: inline-block; padding: 6px 12px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 4px; font-size: 12px; font-weight: 500;">Merge</a>
                        </td>
                    </tr>
            """
        
        html_body += """
                </tbody>
            </table>
            <p style="font-size: 12px; color: #7f1d1d; margin-top: 15px;">Click "Merge" to automatically merge the duplicate into the existing record.</p>
        </div>
        """
    else:
        html_body += """
        <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #166534;">✅ No Duplicates Detected</h3>
            <p style="font-size: 14px; color: #15803d;">All IPO names appear to be unique.</p>
        </div>
        """
    
    html_body += """
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">
            This is an automated report from IPO Radar scraping system.
        </p>
    </div>
    """
    
    admin_email = get_admin_email()
    if admin_email:
        subject = f"IPO Radar: Scraper Summary - {len(all_ipos)} IPOs"
        if potential_duplicates:
            subject += f" ({len(potential_duplicates)} duplicates detected)"
        
        print(f"📧 Sending admin summary to {admin_email}...")
        success = send_email_report(subject, html_body, [admin_email])
        if success:
            print("✅ Admin notification sent successfully")
        else:
            print("❌ Failed to send admin notification")
    else:
        print("⚠️ No admin email configured. Set ADMIN_EMAIL in .env")

if __name__ == "__main__":
    send_scraper_summary()
