import fs from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

const assetDir = path.resolve(__dirname, '../../../../assets/vastriqo-card');
const pageWidth = 297.6;
const pageHeight = 419.52;
const ink = rgb(34 / 255, 24 / 255, 22 / 255);
const white = rgb(1, 1, 1);

function fitSize(font: PDFFont, value: string, preferred: number, maxWidth: number, minimum: number) {
    let size = preferred;
    while (font.widthOfTextAtSize(value, size) > maxWidth && size > minimum) size -= 0.25;
    return size;
}

function drawAtPixel(page: PDFPage, value: string, font: PDFFont, x: number, baselineFromTop: number, size: number, color = ink) {
    page.drawText(value, { x: x * 0.24, y: pageHeight - baselineFromTop * 0.24, size, font, color });
}

// The two backgrounds are sanitized, 300 DPI renders of the supplied A6 card.
// They contain no sample coupon or fixed credit value; only these PDF text layers do.
export async function renderPackageCard(code: string, amountMinor: number): Promise<Buffer> {
    if (!/^VAS-[A-HJ-NP-Z2-9]{12}$|^VSQ-[A-F0-9]{32}$/.test(code) || !Number.isSafeInteger(amountMinor) || amountMinor < 100)
        throw new Error('Invalid package card data');
    const [frontBytes, backBytes, playfairBytes, manropeBytes] = await Promise.all([
        'front-template.png', 'back-template.png', 'PlayfairDisplay-700.ttf', 'Manrope-500.ttf',
    ].map((name) => fs.readFile(path.join(assetDir, name))));
    const pdf = await PDFDocument.create();
    pdf.registerFontkit(fontkit);
    const [frontImage, backImage, playfair, manrope, mono] = await Promise.all([
        pdf.embedPng(frontBytes), pdf.embedPng(backBytes), pdf.embedFont(playfairBytes), pdf.embedFont(manropeBytes), pdf.embedFont(StandardFonts.Courier),
    ]);
    const front = pdf.addPage([pageWidth, pageHeight]);
    const back = pdf.addPage([pageWidth, pageHeight]);
    front.drawImage(frontImage, { x: 0, y: 0, width: pageWidth, height: pageHeight });
    back.drawImage(backImage, { x: 0, y: 0, width: pageWidth, height: pageHeight });

    const amount = `₹${(amountMinor / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    drawAtPixel(front, amount, playfair, 120, 1135, fitSize(playfair, amount, 18, 43, 7), white);
    const headline = `${amount} for your`;
    drawAtPixel(back, headline, playfair, 82, 420, fitSize(playfair, headline, 18.5, 145, 12));
    drawAtPixel(back, code, mono, 119, 694, fitSize(mono, code, 11, 240, 6));
    const step = `Enter the code above. Enjoy ${amount} Credits.`;
    drawAtPixel(back, step, manrope, 151, 1574, fitSize(manrope, step, 8, 223, 6));

    pdf.setTitle(`Vastriqo package credit card ${amount}`);
    pdf.setSubject('Two-sided A6 package credit card');
    pdf.setCreator('Vastriqo');
    return Buffer.from(await pdf.save());
}
