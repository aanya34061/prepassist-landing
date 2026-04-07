import puppeteer from 'puppeteer';

(async () => {
    try {
        console.log('Launching puppeteer...');
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        
        console.log('Navigating to dashboard...');
        await page.goto('http://localhost:3001/dashboard', { waitUntil: 'networkidle0', timeout: 15000 });
        
        console.log('Waiting for potential overlays to render...');
        await new Promise(r => setTimeout(r, 2000));
        
        console.log('Checking what is at the center of the screen...');
        const elementInfo = await page.evaluate(() => {
            const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
            if (!el) return 'No element found at center';
            return {
                tagName: el.tagName,
                className: el.className,
                id: el.id,
                innerHTML: el.innerHTML.substring(0, 100) + '...',
                rect: el.getBoundingClientRect(),
                zIndex: window.getComputedStyle(el).zIndex
            };
        });
        
        console.log('Element at center:', elementInfo);

        console.log('Checking for any elements with fixed or absolute positioning that might cover the screen...');
        const overlays = await page.evaluate(() => {
            const els = Array.from(document.querySelectorAll('*'));
            return els.filter(el => {
                const style = window.getComputedStyle(el);
                if (style.position !== 'fixed' && style.position !== 'absolute') return false;
                if (style.pointerEvents === 'none') return false;
                const rect = el.getBoundingClientRect();
                return rect.width > window.innerWidth * 0.8 && rect.height > window.innerHeight * 0.8;
            }).map(el => ({
                tagName: el.tagName,
                className: el.className,
                rect: el.getBoundingClientRect(),
                zIndex: window.getComputedStyle(el).zIndex
            }));
        });

        console.log('Potential blocking overlays:', overlays);

        await browser.close();
    } catch (e) {
        console.error(e);
    }
})();
