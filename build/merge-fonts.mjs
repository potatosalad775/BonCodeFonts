import { CliProc, Ot } from "ot-builder";
import { readFont, writeFont, isKoreanCharacter } from "./font-io.mjs";

/**
 * Merge Korean glyphs into Latin font
 */
export default async function mergeFont(argv) {
	console.log(`Merging ${argv.latin} + ${argv.korean} → ${argv.output}`);
	
	const latinFont = await readFont(argv.latin);
	const koreanFont = await readFont(argv.korean);
	
	// Validate fonts
	if (!latinFont.cmap?.unicode) {
		throw new Error("Latin font missing Unicode cmap");
	}
	if (!koreanFont.cmap?.unicode) {
		throw new Error("Korean font missing Unicode cmap");
	}
	
	// Filter Korean font to only Korean characters
	filterKoreanFont(koreanFont);
	
	// Merge fonts - Latin font takes priority for any overlapping ranges
	console.log("Merging Korean glyphs into Latin font...");
	CliProc.mergeFonts(latinFont, koreanFont, Ot.ListGlyphStoreFactory);
	
	// Update font metadata for hybrid font
	updateHybridFontMetadata(latinFont, argv);
	
	// Consolidate and optimize
	CliProc.consolidateFont(latinFont);
	
	await writeFont(argv.output, latinFont);
	console.log(`Successfully created: ${argv.output}`);
}

/**
 * Remove non-Korean characters from Korean font to avoid conflicts
 */
function filterKoreanFont(koreanFont) {
	const toRemove = [];
	
	for (const [codePoint, glyph] of koreanFont.cmap.unicode.entries()) {
		if (!isKoreanCharacter(codePoint)) {
			toRemove.push(codePoint);
		}
	}
	
	// Remove non-Korean characters
	for (const codePoint of toRemove) {
		koreanFont.cmap.unicode.delete(codePoint);
	}
	
	console.log(`Filtered Korean font: removed ${toRemove.length} non-Korean characters`);
}

/**
 * Update font metadata for the hybrid font - simplified approach
 */
function updateHybridFontMetadata(font, argv) {
	const familyName = argv.familyName || "BonCode Hybrid";
	const styleName = argv.styleName || "Regular";
	const version = argv.version || "1.000";
	
	// Create proper name records using the approach from Sarasa Gothic
	if (font.name) {
		const records = [];
		const WIN = 3, UNICODE = 1, EN_US = 1033;
		
		// Essential name entries
		records.push({ platformID: WIN, encodingID: UNICODE, languageID: EN_US, nameID: 1, value: familyName }); // Family
		records.push({ platformID: WIN, encodingID: UNICODE, languageID: EN_US, nameID: 2, value: styleName }); // Style
		records.push({ platformID: WIN, encodingID: UNICODE, languageID: EN_US, nameID: 4, value: `${familyName} ${styleName}` }); // Full name
		records.push({ platformID: WIN, encodingID: UNICODE, languageID: EN_US, nameID: 6, value: `${familyName}-${styleName}`.replace(/\s/g, "") }); // PostScript name
		records.push({ platformID: WIN, encodingID: UNICODE, languageID: EN_US, nameID: 16, value: familyName }); // Preferred family
		records.push({ platformID: WIN, encodingID: UNICODE, languageID: EN_US, nameID: 17, value: styleName }); // Preferred style
		
		font.name.records = records;
		console.log(`Updated font metadata: ${familyName} ${styleName}`);
	}
	
	// Update OS/2 table for Korean support
	if (font.os2) {
		font.os2.achVendID = "????";
		font.os2.ulCodePageRange1 |= Ot.Os2.CodePageRange1.CP949 | Ot.Os2.CodePageRange1.CP1361;
	}
	
	// Add version info
	if (font.head) {
		font.head.fontRevision = parseFloat(version);
	}
}
