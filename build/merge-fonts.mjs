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
 * Apply ONLY the essential changes needed for Korean hybrid font
 * Preserve everything else from original font
 */
function updateHybridFontMetadata(font, config) {
	// Use configuration data to set proper names and weights
	// config now contains: familyName, styleName, fontConfig, weightConfig, outputPrefix
	
	// 1. Update family name using config data
	updateHybridFamilyNameFromConfig(font, config);
	
	// 2. Update weight class if specified in config
	updateWeightClassFromConfig(font, config);
	
	// 3. Only update copyright and version to reflect hybrid nature
	updateHybridFontInfo(font, config);
	
	// 4. Add Korean language support to OS/2 (preserve everything else)
	addKoreanLanguageSupport(font);
	
	// 5. Add meta table for macOS Korean detection
	setMetaTable(font);
	
	console.log(`MINIMAL UPDATE: Updated family to "${config.familyName}", style "${config.styleName}", preserved all metadata`);
}

/**
 * Update family name and related fields using configuration data
 * Use configured style names, not always preserve from variable font
 */
function updateHybridFamilyNameFromConfig(font, config) {
	if (!font.name || !font.name.records) return;
	
	const targetFamilyName = config.familyName; // e.g., "Bon Google Sans Code"
	const targetStyleName = config.styleName;   // e.g., "Light", "Regular", "Bold Italic"
	const outputPrefix = config.outputPrefix;   // e.g., "BonGoogleSansCode"
	
	// Determine the correct nameID 2 value based on Windows font conventions
	const styleForNameID2 = determineWindowsStyleName(targetStyleName);
	
	// Determine the correct nameID 1 value based on Windows font conventions
	const familyForNameID1 = determineWindowsFamilyName(targetFamilyName, targetStyleName);
	
	// Find and update name table records
	font.name.records.forEach(record => {
		switch (record.nameID) {
			case 1: // Family name
				record.value = familyForNameID1;
				break;
				
			case 2: // Style name - use configured style or Windows-compatible style
				record.value = styleForNameID2;
				break;
				
			case 4: // Full name
				record.value = `${targetFamilyName} ${targetStyleName}`;
				break;
				
			case 6: // PostScript name
				// Convert to PostScript format: BonGoogleSansCode-Light
				const psStyleName = targetStyleName.replace(/\s+/g, '');
				record.value = `${outputPrefix}-${psStyleName}`;
				break;
		}
		
		// CRITICAL: Update STAT table axis value names (high nameID values)
		// These can contain old weight names that Windows reads
		updateStatAxisValueNames(record, targetStyleName, config.fontConfig);
	});
	
	// Add typographic names (nameID 16/17) for modern Windows compatibility
	addTypographicNames(font, targetFamilyName, targetStyleName);
}

/**
 * Update STAT table axis value names using configuration-based mappings
 * These high nameID values (typically >256) can affect Windows font display
 */
function updateStatAxisValueNames(record, targetStyleName, fontConfig) {
	// High nameIDs (typically >256) are often STAT axis value names
	if (record.nameID < 256) return;
	
	const value = record.value || '';
	if (!value) return;
	
	// FIRST: Use configuration mappings for fonts that have them (like Google Sans Code)
	if (fontConfig && fontConfig.weights) {
		// Check if current axis value name matches any latinSource in config
		for (const [configWeight, weightConfig] of Object.entries(fontConfig.weights)) {
			if (weightConfig.latinSource && value === weightConfig.latinSource) {
				// If target style matches this config weight, update the axis value name
				if (targetStyleName === configWeight || targetStyleName === `${configWeight} Italic`) {
					record.value = configWeight;
					console.log(`Updated STAT axis name: nameID ${record.nameID}: "${value}" → "${configWeight}"`);
					return;
				}
			}
		}
		
		// Special handling for italic-only fonts with config
		// If we have a config but no mapping was found, check if this is an italic variant
		// that should be preserved (like "Italic" axis value for "Bold Italic" font)
		if (targetStyleName.includes('Italic')) {
			// For Google Sans Code, preserve "Italic" axis values for italic fonts
			if (value === 'Italic') {
				// Keep the Italic axis value as-is for proper italic rendering
				console.log(`Preserved STAT axis name: nameID ${record.nameID}: "${value}" (italic axis for ${targetStyleName})`);
				return;
			}
			
			// For base italic styles (just "Italic"), preserve weight axis values that match config
			const baseWeight = targetStyleName.replace(' Italic', '');
			if (baseWeight === 'Regular' || baseWeight === 'Light' || baseWeight === 'Bold') {
				// Check if the current value should be mapped for this base weight
				const baseConfig = fontConfig.weights[baseWeight];
				if (baseConfig && baseConfig.latinSource && value === baseConfig.latinSource) {
					record.value = baseWeight;
					console.log(`Updated STAT axis name: nameID ${record.nameID}: "${value}" → "${baseWeight}" (for ${targetStyleName})`);
					return;
				}
			}
		}
	}
	
	// SECOND: For fonts WITHOUT config mappings, clear redundant STAT axis values for standard Windows styles
	// to prevent "Bold Bold Italic" type issues (only if no config mapping was applied)
	if (targetStyleName === 'Bold' || targetStyleName === 'Bold Italic') {
		// Remove weight-related STAT axis values for standard Bold weights
		// Windows will use nameID 2 instead
		if (value === 'Bold' || value === 'SemiBold' || value === 'Semibold') {
			record.value = '';  // Clear the axis value name
			console.log(`Cleared STAT axis name: nameID ${record.nameID}: "${value}" → "" (avoiding duplication with nameID 2)`);
			return;
		}
	}
	
	// For standard Windows italic styles, handle italic axis values
	if (targetStyleName === 'Italic' || targetStyleName === 'Bold Italic') {
		if (value === 'Italic') {
			record.value = '';  // Clear to avoid duplication with nameID 2
			console.log(`Cleared STAT axis name: nameID ${record.nameID}: "${value}" → "" (avoiding duplication with nameID 2)`);
			return;
		}
	}
	
	// THIRD: Apply fallback mappings for non-standard weights (if no config mapping was found)
	if (!['Regular', 'Bold', 'Italic', 'Bold Italic'].includes(targetStyleName)) {
		if (value !== targetStyleName.replace(' Italic', '')) {
			// Fallback to basic mappings for common cases, but be more precise
			if (value === 'SemiBold' || value === 'Semibold') {
				// Only map to Bold if target is exactly "Bold" (not "SemiBold")
				if (targetStyleName === 'Bold' || targetStyleName === 'Bold Italic') {
					record.value = 'Bold';
					console.log(`Updated STAT axis name: nameID ${record.nameID}: "${value}" → "Bold"`);
				}
			} else if (value === 'Medium' && (targetStyleName === 'Regular' || targetStyleName === 'Regular Italic')) {
				record.value = 'Regular';  
				console.log(`Updated STAT axis name: nameID ${record.nameID}: "${value}" → "Regular"`);
			} else if (value === 'Thin' && (targetStyleName === 'Light' || targetStyleName === 'Light Italic')) {
				record.value = 'Light';
				console.log(`Updated STAT axis name: nameID ${record.nameID}: "${value}" → "Light"`);
			}
		}
	}
}

/**
 * Add typographic family/subfamily names (nameID 16/17)
 * Recommended for modern Windows font handling
 */
function addTypographicNames(font, familyName, styleName) {
	if (!font.name || !font.name.records) return;
	
	const WIN = 3, UNICODE = 1, EN_US = 1033;
	
	// Check if typographic names already exist
	const hasNameID16 = font.name.records.some(r => r.nameID === 16);
	const hasNameID17 = font.name.records.some(r => r.nameID === 17);
	
	// Add nameID 16 (Typographic Family Name) if not present
	if (!hasNameID16) {
		font.name.records.push({
			platformID: WIN,
			encodingID: UNICODE,
			languageID: EN_US,
			nameID: 16,
			value: familyName
		});
	}
	
	// Add nameID 17 (Typographic Subfamily Name) if not present  
	if (!hasNameID17) {
		font.name.records.push({
			platformID: WIN,
			encodingID: UNICODE,
			languageID: EN_US,
			nameID: 17,
			value: styleName
		});
	}
}

/**
 * Determine the correct Windows-compatible family name for nameID 1
 * For standard weights (Bold, Regular, Italic, Bold Italic), use base family name
 * For non-standard weights, include the weight in the family name
 */
function determineWindowsFamilyName(targetFamilyName, targetStyleName) {
	// For standard Windows styles, use base family name without weight
	if (targetStyleName === 'Regular' || targetStyleName === 'Bold' || 
	    targetStyleName === 'Italic' || targetStyleName === 'Bold Italic') {
		// Remove any weight suffix from family name for standard weights
		// e.g., "Bon JetBrains Mono Bold" → "Bon JetBrains Mono"
		const baseFamily = targetFamilyName.replace(/\s+(Bold|SemiBold|Light|Medium|ExtraLight|ExtraBold)$/, '');
		return baseFamily;
	}
	
	// For non-standard weights, keep the full family name (which should include weight)
	return targetFamilyName;
}

/**
 * Determine the correct Windows-compatible style name for nameID 2
 * Windows only recognizes: Regular, Bold, Italic, Bold Italic
 */
function determineWindowsStyleName(configuredStyleName) {
	// Handle italic variants
	if (configuredStyleName.includes('Italic')) {
		// Only return "Bold Italic" for actual Bold weights (700+)
		// For SemiBold, Light, etc. with Italic, just use "Italic"
		if (configuredStyleName === 'Bold Italic') {
			return 'Bold Italic';
		}
		return 'Italic';
	}
	
	// Handle non-italic variants
	// Only return "Bold" for actual Bold weights
	if (configuredStyleName === 'Bold') {
		return 'Bold';
	}
	
	// For Light, Medium, SemiBold, etc. -> use "Regular" for Windows compatibility
	// The actual weight distinction is handled by usWeightClass and family name
	return 'Regular';
}

/**
 * Update weight class based on configuration if specified
 */
function updateWeightClassFromConfig(font, config) {
	if (!font.os2 || !config.weightConfig) return;
	
	// Always update PANOSE and fsSelection based on current weight, even if usWeightClass doesn't change
	const currentWeightClass = font.os2.usWeightClass;
	
	// Update PANOSE weight byte to match current usWeightClass
	updatePanoseWeight(font, currentWeightClass);
	
	// Update fsSelection flags for proper Bold/Regular distinction
	updateFsSelectionForWeight(font, currentWeightClass, config.styleName);
	
	// If the config specifies a different usWeightClass, update it
	if (config.weightConfig.usWeightClass && config.weightConfig.usWeightClass !== currentWeightClass) {
		const targetWeightClass = config.weightConfig.usWeightClass;
		console.log(`Updating weight class: ${currentWeightClass} → ${targetWeightClass}`);
		font.os2.usWeightClass = targetWeightClass;
		
		// Update PANOSE and fsSelection again with new weight
		updatePanoseWeight(font, targetWeightClass);
		updateFsSelectionForWeight(font, targetWeightClass, config.styleName);
	}
}

/**
 * Update PANOSE weight byte (bWeight) to match usWeightClass
 * This is essential for Windows font weight recognition
 */
function updatePanoseWeight(font, usWeightClass) {
	if (!font.os2.panose) return;
	
	// PANOSE weight mapping based on usWeightClass
	let panoseWeight;
	if (usWeightClass <= 100) panoseWeight = 1;      // Very Light
	else if (usWeightClass <= 200) panoseWeight = 2; // Light
	else if (usWeightClass <= 300) panoseWeight = 3; // Thin
	else if (usWeightClass <= 400) panoseWeight = 4; // Normal/Book
	else if (usWeightClass <= 500) panoseWeight = 5; // Medium
	else if (usWeightClass <= 600) panoseWeight = 6; // Demi
	else if (usWeightClass <= 700) panoseWeight = 7; // Bold
	else if (usWeightClass <= 800) panoseWeight = 8; // Heavy
	else panoseWeight = 9;                           // Black
	
	if (font.os2.panose.bWeight !== panoseWeight) {
		console.log(`Updating PANOSE weight: ${font.os2.panose.bWeight} → ${panoseWeight} (usWeightClass: ${usWeightClass})`);
		font.os2.panose.bWeight = panoseWeight;
	}
}

/**
 * Update fsSelection flags for proper Bold/Regular distinction
 * Critical for Windows style recognition
 */
function updateFsSelectionForWeight(font, usWeightClass, styleName) {
	if (!font.os2) return;
	
	const isItalic = styleName && styleName.includes('Italic');
	const isBold = usWeightClass >= 700; // Bold threshold
	
	// Clear existing REGULAR/BOLD flags but preserve other flags
	let newFsSelection = font.os2.fsSelection;
	newFsSelection &= ~(Ot.Os2.FsSelection.REGULAR | Ot.Os2.FsSelection.BOLD);
	
	// Set appropriate weight flag
	if (isBold) {
		newFsSelection |= Ot.Os2.FsSelection.BOLD;
	} else {
		newFsSelection |= Ot.Os2.FsSelection.REGULAR;  
	}
	
	// Handle italic flag
	if (isItalic) {
		newFsSelection |= Ot.Os2.FsSelection.ITALIC;
	} else {
		newFsSelection &= ~Ot.Os2.FsSelection.ITALIC;
	}
	
	if (font.os2.fsSelection !== newFsSelection) {
		console.log(`Updating fsSelection: 0x${font.os2.fsSelection.toString(16)} → 0x${newFsSelection.toString(16)} (${isBold ? 'BOLD' : 'REGULAR'}${isItalic ? ' ITALIC' : ''})`);
		font.os2.fsSelection = newFsSelection;
	}
}

/**
 * Update only font info fields (copyright, version, etc.)
 */
function updateHybridFontInfo(font, config) {
	if (!font.name || !font.name.records) return;
	
	// Update copyright (nameID 0)
	const copyrightRecord = font.name.records.find(r => r.nameID === 0);
	if (copyrightRecord) {
		copyrightRecord.value = "Copyright (c) 2025 Bon-Code-Fonts Project";
	}
	
	// Update version (nameID 5) with incremented version for cache invalidation
	const versionRecord = font.name.records.find(r => r.nameID === 5);
	if (versionRecord) {
		// Increment version to force Windows font cache refresh
		versionRecord.value = config.version;
	}
	
	// Update manufacturer (nameID 8)
	const manufacturerRecord = font.name.records.find(r => r.nameID === 8);
	if (manufacturerRecord) {
		manufacturerRecord.value = "Bon-Code-Fonts Project";
	}
}

/**
 * Add Korean language support to OS/2 table ONLY
 * Preserve all other OS/2 fields including fsSelection, Panose, etc.
 */
function addKoreanLanguageSupport(font) {
	if (!font.os2) return;
	
	// ONLY add Korean code page support, preserve everything else
	font.os2.ulCodePageRange1 = (font.os2.ulCodePageRange1 || 0) | 
		Ot.Os2.CodePageRange1.CP949 |         // Korean Wansung
		Ot.Os2.CodePageRange1.CP1361;         // Korean Johab
	
	// Update vendor ID to identify hybrid fonts
	font.os2.achVendID = "BCFT";
	
	// DO NOT touch fsSelection, Panose, usWeightClass, or any other fields!
}

/**
 * Set meta table for proper language detection by macOS Font Book
 * This tells the system which languages the font is designed to support
 */
function setMetaTable(font) {
	// Create meta table with proper language tags for Korean + Latin support
	// This is crucial for macOS Font Book to recognize Korean capability
	if (!font.meta) {
		font.meta = {};
	}
	
	// Set language tags
	font.meta.data = new Map([
		["dlng", "Latn"],  // Default language: Latin script (for Latin characters)
		["slng", "Kore"]   // Supported languages: Korean scripts
	]);
	
	console.log("Updated meta table: Default=Latin, Supported=Korean");
}
