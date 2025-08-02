import os from "os";
import path from "path";
import * as url from "url";
import fs from "fs-extra";
import verda from "verda";

export const build = verda.create();
const { task, file, oracle, phony, computed } = build.ruleTypes;
const { de, fu } = build.rules;
const { run, node, rm, cd, mv, fail } = build.actions;

// Directories
const PROJECT_ROOT = url.fileURLToPath(new URL(".", import.meta.url));
const BUILD = `.build`;
const OUT = `out`;
const SOURCES = `sources`;

// Set build journal
build.setJournal(`${BUILD}/.verda-build-journal`);
build.setSelfTracking();

///////////////////////////////////////////////////////////////////////////////////////////////////
// Configuration

const Config = oracle("config", async () => {
	const configPath = path.resolve(PROJECT_ROOT, "config/base-config.json");
	return await fs.readJSON(configPath);
});

const Version = oracle("version", async () => {
	const pkg = await fs.readJSON(path.resolve(PROJECT_ROOT, "package.json"));
	return pkg.version;
});

///////////////////////////////////////////////////////////////////////////////////////////////////
// Build Tasks

// Main build target
const Start = phony("all", async t => {
	const [config] = await t.need(Config);
	
	// Build all configured fonts
	const buildTasks = [];
	for (const [fontKey, fontConfig] of Object.entries(config.fonts)) {
		for (const [weightKey, weightConfig] of Object.entries(fontConfig.weights)) {
			if (weightConfig.available) {
				buildTasks.push(HybridFont(fontKey, weightKey, false)); // Regular
				if (fontConfig.hasItalic) {
					buildTasks.push(HybridFont(fontKey, weightKey, true)); // Italic
				}
			}
		}
	}
	
	await t.need(buildTasks);
});

// Variable font instance extraction
const VariableFontInstance = file.make(
	(fontKey, weight, isItalic) => `${BUILD}/variable-instances/${fontKey}-${weight}${isItalic ? "-Italic" : ""}.ttf`,
	async (t, out, fontKey, weight, isItalic) => {
		const [config] = await t.need(Config, de(out.dir));
		
		const fontConfig = config.fonts[fontKey];
		if (!fontConfig.isVariable) {
			throw new Error(`Font ${fontKey} is not configured as a variable font`);
		}
		
		// Get the appropriate variable font file
		const variableFileName = isItalic && fontConfig.variableFontFiles.italic 
			? fontConfig.variableFontFiles.italic 
			: fontConfig.variableFontFiles.regular;
			
		const variableFontPath = path.join(fontConfig.sourcePath, variableFileName);
		
		// Check if source exists
		if (!(await fs.pathExists(variableFontPath))) {
			throw new Error(`Variable font not found: ${variableFontPath}`);
		}
		
		// Extract the specific weight instance
		await node("build/extract-variable-instance.mjs", {
			input: variableFontPath,
			output: out.full,
			weight: weight,
			isItalic: isItalic
		});
	}
);

// Google Sans Code specific build
const GoogleSans = phony("google-sans", async t => {
	const [config] = await t.need(Config);
	const fontConfig = config.fonts.GoogleSansCode;
	
	const buildTasks = [];
	for (const [weightKey, weightConfig] of Object.entries(fontConfig.weights)) {
		if (weightConfig.available) {
			buildTasks.push(HybridFont("GoogleSansCode", weightKey, false));
			if (fontConfig.hasItalic) {
				buildTasks.push(HybridFont("GoogleSansCode", weightKey, true));
			}
		}
	}
	
	await t.need(buildTasks);
});

// JetBrains Mono specific build
const JetBrainsMono = phony("jetbrains-mono", async t => {
	const [config] = await t.need(Config);
	const fontConfig = config.fonts.JetBrainsMono;
	
	const buildTasks = [];
	for (const [weightKey, weightConfig] of Object.entries(fontConfig.weights)) {
		if (weightConfig.available) {
			buildTasks.push(HybridFont("JetBrainsMono", weightKey, false));
			if (fontConfig.hasItalic) {
				buildTasks.push(HybridFont("JetBrainsMono", weightKey, true));
			}
		}
	}
	
	await t.need(buildTasks);
});

// Google Sans Code Variable specific build
const GoogleSansVariable = phony("google-sans-variable", async t => {
	const [config] = await t.need(Config);
	const fontConfig = config.fonts.GoogleSansCodeVariable;
	
	const buildTasks = [];
	for (const [weightKey, weightConfig] of Object.entries(fontConfig.weights)) {
		if (weightConfig.available) {
			buildTasks.push(HybridFont("GoogleSansCodeVariable", weightKey, false));
			if (fontConfig.hasItalic) {
				buildTasks.push(HybridFont("GoogleSansCodeVariable", weightKey, true));
			}
		}
	}
	
	await t.need(buildTasks);
});

// JetBrains Mono Variable specific build
const JetBrainsMonoVariable = phony("jetbrains-mono-variable", async t => {
	const [config] = await t.need(Config);
	const fontConfig = config.fonts.JetBrainsMonoVariable;
	
	const buildTasks = [];
	for (const [weightKey, weightConfig] of Object.entries(fontConfig.weights)) {
		if (weightConfig.available) {
			buildTasks.push(HybridFont("JetBrainsMonoVariable", weightKey, false));
			if (fontConfig.hasItalic) {
				buildTasks.push(HybridFont("JetBrainsMonoVariable", weightKey, true));
			}
		}
	}
	
	await t.need(buildTasks);
});

// Extract Korean glyphs from Sarasa Fixed K
const KoreanExtracted = file.make(
	(fontKey, weight, isItalic) => `${BUILD}/korean/${fontKey}-${weight}${isItalic ? "-Italic" : ""}.ttf`,
	async (t, out, fontKey, weight, isItalic) => {
		const [config] = await t.need(Config, de(out.dir));
		
		// Get weight configuration
		const fontConfig = config.fonts[fontKey];
		const weightConfig = fontConfig.weights[weight];
		
		// Use koreanSource from weight config, fallback to weight name
		const koreanWeight = weightConfig.koreanSource || weight;
		
		const styleName = !(isItalic && weight === 'Regular') 
      ? weight + (isItalic ? "Italic" : "")
      : "Italic";
		const koreanStyleName = !(isItalic && koreanWeight === 'Regular') 
      ? koreanWeight + (isItalic ? "Italic" : "")
      : "Italic";
		const koreanSourcePath = `${SOURCES}/SarasaFixedK/SarasaFixedK-${koreanStyleName}.ttf`;
		
		console.log(`Weight mapping for ${fontKey} ${weight}: using Korean ${koreanWeight}`);
		
		// Check if source exists
		if (!(await fs.pathExists(koreanSourcePath))) {
			throw new Error(`Korean source font not found: ${koreanSourcePath}`);
		}
		
		await node("build/extract-korean.mjs", {
			source: koreanSourcePath,
			output: out.full,
			fontKey: fontKey,
			monoWidth: config.fonts[fontKey].monoWidth,
			config: config
		});
	}
);

// Final hybrid font
const HybridFont = file.make(
	(fontKey, weight, isItalic) => {
		const styleName = !(isItalic && weight === 'Regular') 
      ? weight + (isItalic ? "Italic" : "")
      : "Italic";
		return `${OUT}/${fontKey}/Bon-${fontKey}-${styleName}.ttf`;
	},
	async (t, out, fontKey, weight, isItalic) => {
		const [config, version] = await t.need(Config, Version, de(out.dir));
		
		const fontConfig = config.fonts[fontKey];
		const weightConfig = fontConfig.weights[weight];
		const latinWeight = weightConfig.latinSource || weight;
		
		let latinPath;
		
		// Handle variable vs static fonts
		if (fontConfig.isVariable) {
			// For variable fonts, extract the instance first
			const [variableInstance] = await t.need(VariableFontInstance(fontKey, latinWeight, isItalic));
			latinPath = variableInstance.full;
			console.log(`Using variable font instance: ${latinWeight} from ${fontKey}`);
		} else {
			// For static fonts, use the existing logic
			const latinStyleName = !(isItalic && latinWeight === 'Regular') 
				? latinWeight + (isItalic ? "Italic" : "")
				: "Italic";
			latinPath = `${fontConfig.sourcePath}/${fontConfig.familyName ? fontConfig.familyName : fontKey}-${latinStyleName}.ttf`;
			
			console.log(`Using static font: ${latinWeight} for output weight: ${weight}`);
			
			// Check if static Latin source exists
			if (!(await fs.pathExists(latinPath))) {
				throw new Error(`Latin source font not found: ${latinPath}`);
			}
		}
		
		const styleName = !(isItalic && weight === 'Regular') 
			? weight + (isItalic ? " Italic" : "")
			: "Italic";
		
		// Get extracted Korean font
		const [koreanExtracted] = await t.need(KoreanExtracted(fontKey, weight, isItalic));
		
		// Merge fonts
		await node("build/merge-fonts.mjs", {
			latin: latinPath,
			korean: koreanExtracted.full,
			output: out.full,
			familyName: `Bon ${fontConfig.displayName}`,
			styleName: styleName,
			version: version
		});
	}
);

///////////////////////////////////////////////////////////////////////////////////////////////////
// Utility tasks

// Clean build artifacts
phony("clean", async () => {
	await rm(BUILD);
	build.deleteJournal();
});

// Full clean including outputs
phony("full-clean", async () => {
	await rm(BUILD);
	await rm(OUT);
	build.deleteJournal();
});

// Test task
phony("test", async t => {
	await t.need(HybridFont("GoogleSansCode", "Regular", false));
	console.log("Test build completed successfully!");
});

///////////////////////////////////////////////////////////////////////////////////////////////////
// Helper function to run font build tasks

async function RunFontBuildTask(script, args) {
	return await node(script, args);
}

export default build;
