const puppeteer = require('puppeteer');
const cp = require('child_process');

const screenshot = async (
  url = 'https://agenda.nantes.assopermisdeconstruire.org/',
) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const pages = [];
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(url, {
    waitUntil: 'networkidle2',
  });

  await page.evaluate(sel => {
    // eslint-disable-next-line
    const elements = document.querySelectorAll(sel);
    for (let i = 0; i < elements.length; i += 1) {
      elements[i].style['padding-top'] = '0px';
      elements[i].style['padding-bottom'] = '0px';
      elements[i].style['margin-bottom'] = '-35px';
      elements[i].removeChild(elements[i].lastChild);
      elements[i].firstChild.style.height = '50px';
    }
  }, '.jumbotron');

  await page.evaluate(sel => {
    // eslint-disable-next-line
    const elements = document.querySelectorAll(sel);
    for (let i = 0; i < elements.length; i += 1) {
      elements[i].style.display = 'none';
    }
  }, '.rbc-current-time-indicator');

  await page.evaluate(sel => {
    // eslint-disable-next-line
    const elements = document.querySelectorAll(sel);
    for (let i = 0; i < elements.length; i += 1) {
      elements[i].style['background-color'] = 'inherit';
    }
  }, '.rbc-today');

  for (let i = 0; i < 6; i += 1) {
    // eslint-disable-next-line
    await page.evaluate(sel => {
      // eslint-disable-next-line
      const elements = document.querySelectorAll(sel);
      for (let j = 0; j < elements.length; j += 1) {
        elements[j].style['z-index'] = '-100';
      }
    }, '.rbc-btn-group');
    const screenshotPdf = `/tmp/page_${i}.pdf`;
    await page.emulateMedia('screen');
    await page.pdf({
      scale: 0.9,
      pageRanges: '1',
      path: screenshotPdf,
      printBackground: true,
      landscape: true,
    });
    // eslint-disable-next-line
    await page.evaluate(sel => {
      // eslint-disable-next-line
      const elements = document.querySelectorAll(sel);
      for (let j = 0; j < elements.length; j += 1) {
        elements[j].style['z-index'] = '100';
      }
    }, '.rbc-btn-group');
    await page.click('.rbc-btn-group>button:nth-child(3)');
    pages.push(screenshotPdf);
  }

  await browser.close();

  const output = '/tmp/agenda.pdf';
  cp.execSync(`pdftk ${pages.join(' ')} cat output ${output}`);

  return output;
};

module.exports = screenshot;
