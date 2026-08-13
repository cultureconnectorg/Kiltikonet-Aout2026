"""Playwright snippet used by Bug Testing Agent via mcp_browser_automation.

Scope: /badge-inscription -> cat-visitor -> hCaptcha widget load and no hCaptcha CSP console errors.
This file documents the exact browser test steps executed in the preview environment.
"""

async def run(page):
    await page.set_viewport_size({"width": 1920, "height": 1080})
    console_messages = []
    hcaptcha_responses = []
    failed_requests = []

    page.on("console", lambda msg: console_messages.append({"type": msg.type, "text": msg.text}))
    page.on("response", lambda resp: hcaptcha_responses.append({"url": resp.url, "status": resp.status}) if ("hcaptcha.com" in resp.url or "newassets.hcaptcha.com" in resp.url) else None)
    page.on("requestfailed", lambda req: failed_requests.append({"url": req.url, "failure": str(req.failure)}) if ("hcaptcha.com" in req.url or "newassets.hcaptcha.com" in req.url) else None)

    await page.goto("https://tarifs-update.preview.emergentagent.com/badge-inscription", wait_until="domcontentloaded")
    await page.wait_for_timeout(1000)
    await page.get_by_test_id("cat-visitor").click(force=True)
    await page.wait_for_timeout(7000)

    widget = page.get_by_test_id("hcaptcha-widget")
    await widget.wait_for(state="attached", timeout=10000)
    iframe_sources = await page.evaluate("""() => Array.from(document.querySelectorAll('iframe')).map(f => ({src: f.src, title: f.title, display: getComputedStyle(f).display, visibility: getComputedStyle(f).visibility}))""")
    hcaptcha_iframes = [f for f in iframe_sources if "hcaptcha.com" in (f.get("src") or "")]
    assert hcaptcha_iframes, "No hCaptcha iframe found after selecting visitor category"
    assert any("newassets.hcaptcha.com" in r["url"] and r["status"] < 400 for r in hcaptcha_responses), "No successful newassets.hcaptcha.com response captured"
    csp_console_errors = [m for m in console_messages if ("content security policy" in m["text"].lower() or "violates the following content security policy" in m["text"].lower() or "refused to" in m["text"].lower()) and "hcaptcha" in m["text"].lower()]
    assert not csp_console_errors, f"hCaptcha CSP console errors found: {csp_console_errors}"