async def run_test(page, output_dir, page_url):
    import re
    try:
        await page.set_viewport_size({"width": 1920, "height": 1080})
        await page.goto('https://pose-coach-19--2vmumr4n.preview.emergentagent.com/dashboard', wait_until='networkidle')
        assert await page.locator('[data-testid="dashboard-start-workout"]').is_visible()
        print('PASS dashboard loaded')
        await page.locator('[data-testid="nav-yoga-studio"]').click()
        await page.wait_for_timeout(300)
        yoga_cards = page.locator('[data-testid^="yoga-exercise-card-"]')
        assert await yoga_cards.count() >= 20
        print(f'PASS yoga library count={await yoga_cards.count()}')
        await page.locator('[data-testid="yoga-search-input"]').fill('Tree')
        assert await yoga_cards.count() == 1
        print('PASS yoga search filter')
        await page.locator('[data-testid="nav-home-workout"]').click()
        await page.wait_for_timeout(300)
        workout_cards = page.locator('[data-testid^="workout-exercise-card-"]')
        assert await workout_cards.count() >= 20
        await page.locator('[data-testid="workout-search-input"]').fill('Squat')
        assert await workout_cards.count() == 1
        print(f'PASS workout library/search count={await workout_cards.count()}')
        await page.locator('[data-testid="workout-exercise-card-0"]').click()
        await page.wait_for_timeout(300)
        assert await page.locator('[data-testid="demo-video-play"]').is_visible()
        await page.locator('[data-testid="voice-toggle"]').click()
        await page.locator('[data-testid="camera-start-button"]').click()
        await page.wait_for_timeout(700)
        assert await page.locator('text=Camera tracking').is_visible()
        print('PASS exercise detail and camera denial fallback')
        await page.locator('[data-testid="nav-progress"]').click(); assert await page.locator('text=Minutes trained').is_visible(); print('PASS progress')
        await page.locator('[data-testid="nav-plans"]').click(); assert await page.locator('[data-testid="plan-start-button"]').is_visible(); print('PASS plans')
        await page.locator('[data-testid="nav-assistant"]').click(); await page.locator('[data-testid="assistant-input"]').fill('Give one warm-up tip'); await page.locator('[data-testid="assistant-send-button"]').click(); await page.wait_for_timeout(5000); assert await page.locator('[data-testid^="assistant-message-"]').count() >= 3; print('PASS assistant response flow')
        await page.locator('[data-testid="language-toggle"]').click(); assert await page.locator('text=सुप्रभात').is_visible(); print('PASS language toggle')
        await page.goto('https://pose-coach-19--2vmumr4n.preview.emergentagent.com/auth', wait_until='networkidle')
        assert await page.locator('[data-testid="auth-email-input"]').is_visible(); await page.locator('[data-testid="auth-signin-button"]').click(); assert await page.locator('[data-testid="auth-message"]').is_visible(); print('PASS auth configuration message')
        await page.set_viewport_size({"width":390,"height":844}); await page.goto('https://pose-coach-19--2vmumr4n.preview.emergentagent.com/dashboard', wait_until='networkidle'); await page.wait_for_timeout(300)
        overflow = await page.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth')
        assert not overflow, f'horizontal overflow: {await page.evaluate("document.documentElement.scrollWidth")}'
        print('PASS mobile no horizontal overflow')
        errors = await page.evaluate("""() => { const errorElements = Array.from(document.querySelectorAll('.error, [class*="error"], [id*="error"]')); return errorElements.map(el => el.textContent).join(', '); }""")
        print('No error messages found on page' if not errors else f'Found error message: {errors}')
    except AssertionError as e:
        print(f'FINDING: {e}')
    except Exception as e:
        print(f'FINDING: script/runtime failure: {e}')

