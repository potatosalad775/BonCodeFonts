import { CliProc, Ot } from "ot-builder";
import { readFont, writeFont, isKoreanCharacter, setAdvanceWidth, getAdvanceWidth } from "./font-io.mjs";

/**
 * Extract Korean glyphs from source font and scale to match target coordinate system
 */
export default async function extractKorean(argv) {
	const sourceFont = await readFont(argv.source);
	const config = argv.config || {};
	const fontKey = argv.fontKey; // Font key to get specific adjustments
	
	console.log(`Extracting Korean glyphs from: ${argv.source}`);
	console.log(`Target font: ${fontKey}`);
	console.log(`Output: ${argv.output}`);
	
	// Remove non-Korean characters from the source font
	removeNonKoreanCharacters(sourceFont);
	
	// Adjust each Korean glyph for coordinate system and monospace compatibility
	adjustKoreanGlyphsForHybrid(sourceFont, config, fontKey);
	
	// Ensure .notdef glyph exists
	ensureNotdefGlyph(sourceFont, argv.monoWidth || 1200);
	
	await writeFont(argv.output, sourceFont);
	console.log(`Korean glyphs extracted and adjusted successfully`);
}

function removeNonKoreanCharacters(font) {
	// Remove non-Korean characters from cmap
	const toRemove = [];
	
	if (font.cmap?.unicode) {
		for (const [codePoint, glyph] of font.cmap.unicode.entries()) {
			if (!isKoreanCharacter(codePoint)) {
				toRemove.push(codePoint);
			}
		}
		
		// Remove non-Korean characters
		for (const codePoint of toRemove) {
			font.cmap.unicode.delete(codePoint);
		}
	}
	
	console.log(`Filtered Korean font: removed ${toRemove.length} non-Korean characters`);
}

function adjustKoreanGlyphsForHybrid(font, config, fontKey) {
	if (!font.cmap?.unicode) return;
	
	// Get font-specific Korean adjustments
	const fontConfig = config.fonts?.[fontKey];
	const adjustments = fontConfig?.koreanAdjustments || {};
	let adjustedCount = 0;
	
	console.log(`Adjusting Korean glyphs for ${fontKey} with config:`, adjustments);
	
	for (const [codePoint, glyph] of font.cmap.unicode.entries()) {
		if (isKoreanCharacter(codePoint)) {
			adjustGlyphForHybrid(glyph, codePoint, adjustments, fontConfig);
			adjustedCount++;
			
			// Limit output for readability
			if (adjustedCount <= 5) {
				console.log(`  Processed: U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`);
			}
		}
	}
	
	console.log(`Adjusted ${adjustedCount} Korean glyphs for hybrid font`);
}

/**
 * Scale a glyph to match target coordinate system and dimensions
 */
function scaleGlyph(glyph, scaleX, scaleY, offsetX = 0, offsetY = 0) {
	if (!glyph.geometry) return;
	
	try {
		// Use ot-builder's geometry utilities
		const contours = Ot.GeometryUtil.apply(Ot.GeometryUtil.Flattener, glyph.geometry);
		
		for (const contour of contours) {
			for (const point of contour) {
				if (point.x !== undefined) point.x = point.x * scaleX + offsetX;
				if (point.y !== undefined) point.y = point.y * scaleY + offsetY;
			}
		}
		
		// Rebuild geometry
		glyph.geometry = new Ot.Glyph.ContourSet(contours);
		
	} catch (error) {
		console.log(`  Warning: Could not scale glyph geometry: ${error.message}`);
	}
}

/**
 * Adjust Korean glyph for coordinate system matching and monospace
 */
function adjustGlyphForHybrid(glyph, codePoint, adjustments, fontConfig) {
	if (!adjustments) return;
	
	// Get current advance width
	const currentWidth = getAdvanceWidth(glyph);
	
	// Apply coordinate system scaling to match target font
	if (adjustments.scaleToMatchHeight) {
		const scaleX = adjustments.scaleX || 1.0;
		const scaleY = adjustments.scaleY || 1.0;
		const offsetX = adjustments.offsetX || 0;
		const offsetY = adjustments.offsetY || 0;
		
		scaleGlyph(glyph, scaleX, scaleY, offsetX, offsetY);
	}

	// Set final advance width
	let finalWidth;
	
	if (adjustments.forceMonoWidth) {
		// Force to specific mono width
		const targetMonoWidth = fontConfig?.monoWidth || 1200;
		finalWidth = targetMonoWidth;
	} else if (adjustments.useNativeWidth) {
		// Keep the glyph's native width (possibly scaled)
		finalWidth = getAdvanceWidth(glyph);
	} else if (adjustments.targetWidth) {
		// Use configured target width
		finalWidth = adjustments.targetWidth;
	} else {
		// Default: scale the current width
		finalWidth = Math.round(currentWidth * (adjustments.scaleX || 1.0));
	}

	// Apply centering if requested
	if (adjustments.centerInCell && finalWidth !== getAdvanceWidth(glyph)) {
		const actualWidth = getAdvanceWidth(glyph);
		const centerOffset = (finalWidth - actualWidth) / 2;
		
		if (Math.abs(centerOffset) > 1) {
			scaleGlyph(glyph, 1.0, 1.0, centerOffset, 0);
		}
	}

	// Set the final advance width
	setAdvanceWidth(glyph, finalWidth);
}

function ensureNotdefGlyph(font, width) {
	// Check if .notdef glyph exists in the font
	let hasNotdef = false;
	
	if (font.cmap?.unicode) {
		for (const [codePoint, glyph] of font.cmap.unicode.entries()) {
			if (glyph.name === ".notdef") {
				hasNotdef = true;
				break;
			}
		}
	}
	
	// .notdef handling is complex and usually already exists in source fonts
	// For now, we'll rely on the source font having a proper .notdef
	if (!hasNotdef) {
		console.log("Warning: No .notdef glyph found in source font");
	}
}
