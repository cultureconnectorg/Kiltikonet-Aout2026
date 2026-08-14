# Bug verification script for the Kiltikonet homepage PNG mockup regression.
# This script body is executed through the browser automation tool with an async
# Playwright `page` object. It focuses only on the reported homepage design bug.

import re

await page.set_viewport_size({"width": 1920, "height": 1080})

try:
    print("STEP: open homepage")
    await page.goto("https://tarifs-update.preview.emergentagent.com/", wait_until="domcontentloaded", timeout=45000)
    await page.wait_for_timeout(2500)

    # Pass first-visit intro if shown.
    skip_intro = page.locator('[data-testid="skip-intro-global"]').first
    if await skip_intro.count() > 0 and await skip_intro.is_visible():
        print("STEP: intro splash visible; clicking Passer")
        await skip_intro.click(force=True)
        await page.wait_for_timeout(1000)
    else:
        print("STEP: no intro splash visible")

    # Refuse cookie banner if shown.
    refuser = page.get_by_text(re.compile(r"Refuser", re.I)).first
    if await refuser.count() > 0 and await refuser.is_visible():
        print("STEP: cookie banner visible; clicking Refuser")
        await refuser.click(force=True)
        await page.wait_for_timeout(600)
    else:
        print("STEP: no cookie banner visible")

    await page.wait_for_selector('[data-testid="kiltikonet-home"]', timeout=30000)
    await page.wait_for_timeout(2500)
    print("PASS: Kiltikonet homepage root rendered")

    # API response used for Section 06 metrics.
    api_now = await page.evaluate("""async () => {
        const r = await fetch('/api/observatory/public/now');
        return {status: r.status, data: await r.json()};
    }""")
    print(f"API_NOW: {api_now}")

    checks = {}
    checks['root_bg'] = await page.locator('[data-testid="kiltikonet-home"]').evaluate("el => getComputedStyle(el).backgroundColor")
    checks['body_bg'] = await page.evaluate("getComputedStyle(document.body).backgroundColor")
    checks['intro_visible_after_skip'] = await page.locator('[data-testid="intro-sequence"]').is_visible()
    checks['global_header_count'] = await page.locator('[data-testid="header"]').count()
    checks['hero_header_count'] = await page.locator('[data-testid="hero-header"]').count()
    checks['logo_link_visible'] = await page.locator('[data-testid="logo-link"]').is_visible()
    checks['logo_mark_visible'] = await page.locator('[data-testid="logo-mark"]').first.is_visible()
    checks['nav_text'] = await page.locator('[data-testid="hero-header"] nav').inner_text()
    checks['burger_visible'] = await page.locator('[data-testid="menu-burger"]').is_visible()
    checks['hero_title'] = await page.locator('[data-testid="hero-title"]').inner_text()
    checks['hero_title_font'] = await page.locator('[data-testid="hero-title"]').evaluate("el => getComputedStyle(el).fontFamily")
    checks['hero_title_size'] = await page.locator('[data-testid="hero-title"]').evaluate("el => getComputedStyle(el).fontSize")
    checks['hero_tagline'] = await page.locator('[data-testid="hero-tagline"]').inner_text()
    checks['tagline_gold_italic_count'] = await page.locator('[data-testid="hero-tagline"] span').evaluate_all("els => els.filter(el => getComputedStyle(el).color === 'rgb(201, 168, 76)' && getComputedStyle(el).fontStyle === 'italic').length")
    checks['hero_lead'] = await page.locator('[data-testid="hero-lead"]').inner_text()
    checks['hero_pillars'] = await page.locator('[data-testid="hero-pillars"]').inner_text()
    checks['worldmap_visible'] = await page.locator('[data-testid="hero-worldmap"]').is_visible()
    checks['worldmap_labels'] = await page.locator('[data-testid="hero-worldmap"] text').evaluate_all("els => els.map(e => e.textContent.trim())")
    checks['scroll_hint'] = await page.locator('[data-testid="scroll-hint"]').inner_text()
    checks['section02_text'] = await page.locator('[data-testid="section-02"]').inner_text()
    checks['section03_text'] = await page.locator('[data-testid="section-03"]').inner_text()
    checks['network_visible'] = await page.locator('[data-testid="network-diagram"]').is_visible()
    checks['network_labels'] = await page.locator('[data-testid="network-diagram"] text').evaluate_all("els => els.map(e => e.textContent.trim())")
    checks['section04_text'] = await page.locator('[data-testid="section-04"]').inner_text()
    checks['section04_image_visible'] = await page.locator('[data-testid="section-04-image"] svg').is_visible()
    checks['cc_2026_href'] = await page.locator('[data-testid="cc-2026"]').get_attribute('href')
    checks['cc_2027_href'] = await page.locator('[data-testid="cc-2027"]').get_attribute('href')
    checks['infra_tags'] = await page.locator('[data-testid="infra-tags"]').inner_text()
    checks['fingerprint_visible'] = await page.locator('[data-testid="fingerprint"]').is_visible()
    checks['metrics'] = {
        'traces': await page.locator('[data-testid="metric-traces"]').inner_text(),
        'acteurs': await page.locator('[data-testid="metric-acteurs"]').inner_text(),
        'activites': await page.locator('[data-testid="metric-activites"]').inner_text(),
        'identites': await page.locator('[data-testid="metric-identites"]').inner_text(),
    }
    checks['data_lineage'] = await page.locator('[data-testid="data-lineage"]').inner_text()
    checks['section07_text'] = await page.locator('[data-testid="section-07"]').inner_text()
    checks['obs_cta_href'] = await page.locator('[data-testid="cta-observatory"]').get_attribute('href')
    checks['obs_constellation_visible'] = await page.locator('[data-testid="obs-constellation"] svg').is_visible()
    checks['obs_bars_visible'] = await page.locator('[data-testid="obs-bars"] svg').is_visible()
    checks['obs_feed'] = await page.locator('[data-testid="obs-feed"]').inner_text()
    checks['footer_cols'] = await page.locator('[data-testid^="footer-col-"]').evaluate_all("els => els.map(e => ({testid:e.getAttribute('data-testid'), text:e.innerText}))")
    checks['footer_pullquote'] = await page.locator('[data-testid="footer-pullquote"]').inner_text()
    checks['footer_bottom'] = await page.locator('[data-testid="section-08-footer"]').inner_text()

    # Get error messages using specific selectors
    error_text = await page.evaluate("""() => {
    const errorElements = Array.from(document.querySelectorAll('.error, [class*="error"], [id*="error"]'));
    return errorElements.map(el => el.textContent).join(", ");
    }""")
    if error_text:
        print(f"Found error message: {error_text}")
    else:
        print("No error messages found on the page")

    await page.screenshot(path="/app/test_reports/kiltikonet_home_fullpage.png", full_page=True)
    print(f"CHECKS: {checks}")
    print("PASS: browser verification completed")
except Exception as exc:
    print(f"FAIL: browser verification failed: {exc}")
    await page.screenshot(path="/app/test_reports/kiltikonet_home_failure.png", quality=40, full_page=False)
    raise