import puppeteer from 'puppeteer';

(async () => {
    try {
        const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
        const page = await browser.newPage();
        
        page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
        page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
        
        console.log('Navigating to /login...');
        const response1 = await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
        console.log('Login Status:', response1.status());
        
        await new Promise(r => setTimeout(r, 2000));
        
        const html1 = await page.evaluate(() => document.body.innerHTML);
        console.log('LOGIN BODY LENGTH:', html1.length);
        
        console.log('Navigating to /dashboard directly (unauthenticated)...');
        const response2 = await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle0' });
        console.log('Dashboard Status:', response2?.status());
        
        await new Promise(r => setTimeout(r, 2000));
        const html2 = await page.evaluate(() => document.body.innerHTML);
        console.log('DASHBOARD BODY LENGTH:', html2.length);

        const currentUrl = page.url();
        console.log('FINAL URL:', currentUrl);
        
        await browser.close();
    } catch (e) {
        console.error('PUPPETEER ERROR:', e);
    }
})();
