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
 * Update font metadata for the hybrid font - comprehensive approach
 */
function updateHybridFontMetadata(font, argv) {
	const familyName = argv.familyName || "BonCode Hybrid";
	const styleName = argv.styleName || "Regular";
	const version = argv.version || "1.000";
	const isMonospace = true; // All coding fonts are monospace
	
	// Set font name table with all required entries
	setFontName(font, familyName, styleName, version);
	
	// Set OS/2 table metadata
	setOS2Metadata(font, isMonospace);
	
	// Set head table flags
	setHeadFlags(font, version);
	
	// Update meta table for proper language detection
	setMetaTable(font);
	
	console.log(`Updated font metadata: ${familyName} ${styleName}`);
}

/**
 * Set comprehensive font name table
 */
function setFontName(font, familyName, styleName, version) {
	if (!font.name) return;
	
	const records = [];
	const WIN = 3, UNICODE = 1, EN_US = 1033;
	
	// Get compatibility naming for standard four styles
	const compat = getCompatibilityName(familyName, styleName);
	const postscriptName = toPostscriptName(`${familyName} ${styleName}`);
	const uniqueName = `${familyName} ${styleName} ${version}`;
	
	// Required name entries for Windows compatibility
	records.push({ platformID: WIN, encodingID: UNICODE, languageID: EN_US, nameID: 0, value: `Copyright (c) 2025 Bon-Code-Fonts Project` }); // Copyright
	records.push({ platformID: WIN, encodingID: UNICODE, languageID: EN_US, nameID: 1, value: compat.family }); // Family
	records.push({ platformID: WIN, encodingID: UNICODE, languageID: EN_US, nameID: 2, value: compat.style }); // Style
	records.push({ platformID: WIN, encodingID: UNICODE, languageID: EN_US, nameID: 3, value: uniqueName }); // Unique name
	records.push({ platformID: WIN, encodingID: UNICODE, languageID: EN_US, nameID: 4, value: `${compat.family} ${compat.style}`.trim() }); // Full name
	records.push({ platformID: WIN, encodingID: UNICODE, languageID: EN_US, nameID: 5, value: `Version ${version}` }); // Version
	records.push({ platformID: WIN, encodingID: UNICODE, languageID: EN_US, nameID: 6, value: postscriptName }); // PostScript name
	records.push({ platformID: WIN, encodingID: UNICODE, languageID: EN_US, nameID: 7, value: "Bon-Code-Fonts" }); // Trademark
	records.push({ platformID: WIN, encodingID: UNICODE, languageID: EN_US, nameID: 8, value: "Bon-Code-Fonts Project" }); // Manufacturer
	records.push({ platformID: WIN, encodingID: UNICODE, languageID: EN_US, nameID: 9, value: "Bon-Code-Fonts Team" }); // Designer
	records.push({ platformID: WIN, encodingID: UNICODE, languageID: EN_US, nameID: 16, value: familyName }); // Preferred family
	records.push({ platformID: WIN, encodingID: UNICODE, languageID: EN_US, nameID: 17, value: styleName }); // Preferred style
	
	font.name.records = records;
}

/**
 * Set OS/2 table metadata for Windows compatibility
 */
function setOS2Metadata(font, isMonospace) {
	if (!font.os2) return;
	
	// Set fsSelection flags
	font.os2.fsSelection |= Ot.Os2.FsSelection.USE_TYPO_METRICS;
	font.os2.fsSelection &= ~Ot.Os2.FsSelection.WWS;
	
	// Clear and set vendor ID
	font.os2.achVendID = "BCFT";
	
	// Fix and round usWeightClass
	font.os2.usWeightClass = 100 * Math.round(font.os2.usWeightClass / 100);
	
	// Set specific code page support for hybrid coding fonts
	// Clear existing code page flags and set only what we need
	font.os2.ulCodePageRange1 = 
		Ot.Os2.CodePageRange1.CP1252 |        // Latin 1 (essential for basic Latin)
		Ot.Os2.CodePageRange1.CP949 |         // Korean (primary addition)
		Ot.Os2.CodePageRange1.CP950;          // Chinese Traditional (from Sarasa)
		
	// Note: Removed European code pages (CP1250, CP1251, CP1254, CP1257) and 
	// Macintosh flags that may confuse macOS Font Book's language detection
	
	// Set Panose classification
	font.os2.panose = {
		bFamilyType: 2,           // Text and Display
		bSerifStyle: 0,           // Any
		bWeight: Math.min(10, Math.max(1, (1 + font.os2.usWeightClass / 100) | 0)), // Weight class
		bProportion: isMonospace ? 9 : 0, // Monospaced or Any
		bContrast: 0,             // Any
		bStrokeVariation: 0,      // Any
		bArmStyle: 0,             // Any
		bLetterform: 0,           // Any
		bMidline: 0,              // Any
		bXHeight: 0               // Any
	};
}

/**
 * Set head table flags for proper rendering
 */
function setHeadFlags(font, version) {
	if (!font.head) return;
	
	// Set font revision
	font.head.fontRevision = parseFloat(version);
	
	// Set important flags for Windows compatibility
	font.head.flags |=
		Ot.Head.Flags.BaseLineYAt0 |
		Ot.Head.Flags.LeftSidebearingAtX0 |
		Ot.Head.Flags.ForcePpemToBeInteger |
		Ot.Head.Flags.InstructionsMayDependOnPointSize;
}

/**
 * Get compatibility naming for standard four styles
 */
function getCompatibilityName(family, style) {
	if (style === "Regular" || style === "Bold" || style === "Italic" || style === "Bold Italic") {
		return { family, style, standardFour: true };
	} else {
		// Handle non-standard styles
		if (/^Extra/.test(style)) {
			style = style.replace(/^Extra/, "X"); // Prevent name overflow
		}
		if (/Italic/.test(style)) {
			return {
				family: family + " " + style.replace(/Italic/, "").trim(),
				style: "Italic",
				standardFour: false
			};
		} else {
			return { 
				family: family + " " + style, 
				style: "Regular", 
				standardFour: false 
			};
		}
	}
}

/**
 * Convert name to PostScript-compatible format
 */
function toPostscriptName(name) {
	return name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9\-]/g, "");
}

/**
 * Set meta table for proper language detection by macOS Font Book
 * This tells the system which languages the font is designed to support
 */
function setMetaTable(font) {
	// Create or update meta table to declare Korean and Latin support
	// This helps macOS Font Book prioritize Korean text in previews
	font.meta = {
		data: [
			["dlng", "Latn"],  // Default language: Latin (for Latin characters)
			["slng", "Kore"]   // Supported language: Korean (prioritize Korean over Cyrillic)
		]
	};
	
	console.log("Updated meta table: Default=Latin, Supported=Korean");
}
