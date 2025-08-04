import { FontIo, Ot } from "ot-builder";
import fs from "fs-extra";
import path from "path";
import { spawn } from "child_process";
import { promisify } from "util";

/**
 * Extract a specific weight instance from a variable font using fonttools
 */
export async function extractVariableFontInstance(variableFontPath, targetWeight, isItalic = false) {
	console.log(`Extracting weight ${targetWeight} from variable font: ${variableFontPath}`);
	
	// Check if fonttools is available
	try {
		await runCommand('fonttools');
	} catch (error) {
		console.warn('fonttools not found, falling back to simple font reading...');
		return await fallbackVariableFontHandling(variableFontPath, targetWeight, isItalic);
	}
	
	// Use fonttools to instantiate the variable font
	const weightValue = getWeightValue(targetWeight);
	const tempOutputPath = variableFontPath.replace('.ttf', `_${targetWeight}_temp.ttf`);
	
	try {
		// Create instance using fonttools
		await runCommand('fonttools', [
			'varLib.instancer',
			variableFontPath,
			`wght=${weightValue}`,
			'--output',
			tempOutputPath
		]);
		
		// Read the instantiated font
		const buffer = await fs.readFile(tempOutputPath);
		const sfnt = FontIo.readSfntOtf(buffer);
		const font = FontIo.readFont(sfnt, Ot.ListGlyphStoreFactory);
		
		// Clean up temp file
		await fs.remove(tempOutputPath);
		
		// Update font names for the instance
		updateInstanceNames(font, targetWeight, isItalic);
		
		return font;
		
	} catch (error) {
		// Clean up temp file if it exists
		if (await fs.pathExists(tempOutputPath)) {
			await fs.remove(tempOutputPath);
		}
		
		console.warn(`fonttools instantiation failed: ${error.message}`);
		console.warn('Falling back to simple font reading...');
		return await fallbackVariableFontHandling(variableFontPath, targetWeight, isItalic);
	}
}

/**
 * Fallback method when fonttools is not available
 * Just reads the variable font as-is (using default instance)
 */
async function fallbackVariableFontHandling(variableFontPath, targetWeight, isItalic) {
	console.log(`Reading variable font directly (using default instance): ${variableFontPath}`);
	
	const buffer = await fs.readFile(variableFontPath);
	const sfnt = FontIo.readSfntOtf(buffer);
	const font = FontIo.readFont(sfnt, Ot.ListGlyphStoreFactory);
	
	// Update font names for the target weight
	updateInstanceNames(font, targetWeight, isItalic);
	
	// Remove variable font tables to make it appear as a static font
	cleanupVariableFontTables(font);
	
	console.log(`Warning: Using default instance of variable font. Install fonttools for proper weight extraction.`);
	
	return font;
}

/**
 * Run a command and return a promise
 */
function runCommand(command, args) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, { stdio: 'pipe' });
		
		let stdout = '';
		let stderr = '';
		
		child.stdout.on('data', (data) => {
			stdout += data.toString();
		});
		
		child.stderr.on('data', (data) => {
			stderr += data.toString();
		});
		
		child.on('close', (code) => {
			if (code === 0) {
				resolve(stdout);
			} else {
				reject(new Error(`Command failed with code ${code}: ${stderr}`));
			}
		});
		
		child.on('error', (error) => {
			reject(error);
		});
	});
}

/**
 * Convert weight name to numeric value
 */
function getWeightValue(weightName) {
	const weightMap = {
		'Thin': 100,
		'ExtraLight': 200,
		'Light': 300,
		'Regular': 400,
		'Medium': 500,
		'SemiBold': 600,
		'Bold': 700,
		'ExtraBold': 800,
		'Black': 900
	};
	
	return weightMap[weightName] || 400;
}

/**
 * Update font names for the specific instance
 */
function updateInstanceNames(font, weight, isItalic) {
	if (!font.name || !font.name.records) return;
	
	const styleName = weight + (isItalic ? " Italic" : "");
	const weightValue = getWeightValue(weight);
	
	// Update name records
	for (const record of font.name.records) {
		if (record.nameID === 2) { // Subfamily name (style)
			record.value = styleName;
		} else if (record.nameID === 4) { // Full font name
			const familyName = getFamilyName(font);
			record.value = `${familyName} ${styleName}`;
		} else if (record.nameID === 6) { // PostScript name
			const familyName = getFamilyName(font);
			record.value = `${familyName}-${styleName}`.replace(/\s/g, "");
		} else if (record.nameID === 17) { // Preferred subfamily
			record.value = styleName;
		}
	}
	
	// Update OS/2 weight class AND fsSelection
	if (font.os2) {
		font.os2.usWeightClass = weightValue;
		
		// CRITICAL FIX: Update fsSelection for weight-specific Windows detection
		// Variable fonts have generic fsSelection that doesn't work for instances
		font.os2.fsSelection = Ot.Os2.FsSelection.USE_TYPO_METRICS;
		
		// Set weight-specific flags
		if (weightValue >= 700) {
			// Bold and heavier weights
			font.os2.fsSelection |= Ot.Os2.FsSelection.BOLD;
		} else {
			// Light through SemiBold
			font.os2.fsSelection |= Ot.Os2.FsSelection.REGULAR;
		}
		
		// Add italic flag if needed
		if (isItalic) {
			font.os2.fsSelection |= Ot.Os2.FsSelection.ITALIC;
			// Italic fonts should not have REGULAR flag even at 400 weight
			font.os2.fsSelection &= ~Ot.Os2.FsSelection.REGULAR;
		}
		
		console.log(`Updated fsSelection for ${styleName}: 0x${font.os2.fsSelection.toString(16)} (weight: ${weightValue})`);
	}
	
	console.log(`Updated font names for ${styleName}`);
}

/**
 * Get family name from font
 */
function getFamilyName(font) {
	if (!font.name || !font.name.records) return "Unknown";
	
	const familyRecord = font.name.records.find(r => r.nameID === 1 || r.nameID === 16);
	return familyRecord ? familyRecord.value : "Unknown";
}

/**
 * Remove variable font tables that are no longer needed
 */
function cleanupVariableFontTables(font) {
	// Remove variable font specific tables
	delete font.fvar;  // Font variations table
	delete font.avar;  // Axis variations table
	delete font.gvar;  // Glyph variations table
	delete font.hvar;  // Horizontal metrics variations table
	delete font.vvar;  // Vertical metrics variations table
	delete font.mvar;  // Metrics variations table
	
	console.log("Cleaned up variable font tables");
}

/**
 * Save extracted instance to file
 */
export async function saveVariableFontInstance(variableFontPath, outputPath, targetWeight, isItalic = false) {
	const staticFont = await extractVariableFontInstance(variableFontPath, targetWeight, isItalic);
	
	// Write the static font
	const sfnt = FontIo.writeFont(staticFont, { glyphStore: { statOs2XAvgCharWidth: false } });
	const buffer = FontIo.writeSfntOtf(sfnt);
	
	await fs.ensureDir(path.dirname(outputPath));
	await fs.writeFile(outputPath, buffer);
	
	console.log(`Saved static instance: ${outputPath}`);
	return outputPath;
}
