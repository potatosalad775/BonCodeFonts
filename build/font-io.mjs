import fs from "fs-extra";
import path from "path";
import { FontIo, Ot } from "ot-builder";

/**
 * Read a font file and return font object
 */
export async function readFont(filePath) {
	const buffer = await fs.readFile(filePath);
	const sfnt = FontIo.readSfntOtf(buffer);
	const font = FontIo.readFont(sfnt, Ot.ListGlyphStoreFactory);
	return font;
}

/**
 * Write font object to file
 */
export async function writeFont(filePath, font) {
	const sfnt = FontIo.writeFont(font, { glyphStore: { statOs2XAvgCharWidth: false } });
	const buffer = FontIo.writeSfntOtf(sfnt);
	await fs.ensureDir(path.dirname(filePath));
	await fs.writeFile(filePath, buffer);
}

/**
 * Get glyph advance width
 */
export function getAdvanceWidth(glyph) {
	if (glyph.horizontal) return glyph.horizontal.end;
	return 0;
}

/**
 * Set glyph advance width for monospace
 */
export function setAdvanceWidth(glyph, width) {
	glyph.horizontal = { start: 0, end: width };
}

/**
 * Check if a character code is in Korean ranges
 */
export function isKoreanCharacter(codePoint) {
	return (
		// Hangul Syllables
		(codePoint >= 0xAC00 && codePoint <= 0xD7AF) ||
		// Hangul Jamo
		(codePoint >= 0x1100 && codePoint <= 0x11FF) ||
		// Hangul Compatibility Jamo
		(codePoint >= 0x3130 && codePoint <= 0x318F) ||
		// Selected CJK punctuation
		[0x3000, 0x3001, 0x3002, 0x300C, 0x300D, 0x300E, 0x300F].includes(codePoint)
	);
}
