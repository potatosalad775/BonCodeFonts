#!/usr/bin/env node

import fs from "fs-extra";
import path from "path";

async function testFonts() {
    console.log("🧪 Testing BonCode Fonts build system...\n");
    
    const outputDir = "out";
    const tests = [
        // Static fonts
        { type: "static", font: "GoogleSansCode", file: "Bon-GoogleSansCode-Regular.ttf" },
        { type: "static", font: "JetBrainsMono", file: "Bon-JetBrainsMono-Regular.ttf" },
        
        // Variable fonts  
        { type: "variable", font: "GoogleSansCodeVariable", file: "Bon-GoogleSansCodeVariable-Regular.ttf" },
        { type: "variable", font: "JetBrainsMonoVariable", file: "Bon-JetBrainsMonoVariable-Regular.ttf" }
    ];
    
    let passedTests = 0;
    let totalTests = tests.length;
    
    for (const test of tests) {
        const fontPath = path.join(outputDir, test.font, test.file);
        const exists = await fs.pathExists(fontPath);
        
        if (exists) {
            const stats = await fs.stat(fontPath);
            const sizeKB = Math.round(stats.size / 1024);
            console.log(`✅ ${test.type.toUpperCase().padEnd(8)} ${test.font.padEnd(25)} (${sizeKB} KB)`);
            passedTests++;
        } else {
            console.log(`❌ ${test.type.toUpperCase().padEnd(8)} ${test.font.padEnd(25)} - FILE NOT FOUND`);
        }
    }
    
    console.log(`\n📊 Test Results: ${passedTests}/${totalTests} fonts generated successfully`);
    
    if (passedTests === totalTests) {
        console.log("🎉 All tests passed! BonCode Fonts are ready to use.");
        
        // Additional information
        console.log("\n📁 Generated font locations:");
        for (const test of tests) {
            const fontDir = path.join(outputDir, test.font);
            if (await fs.pathExists(fontDir)) {
                const files = await fs.readdir(fontDir);
                const ttfFiles = files.filter(f => f.endsWith('.ttf'));
                console.log(`   ${test.font}: ${ttfFiles.length} fonts`);
            }
        }
        
        console.log("\n💡 Tips:");
        console.log("   • Variable fonts provide better weight matching");
        console.log("   • Install fonttools (pip install fonttools) for optimal results");
        console.log("   • See VARIABLE_FONTS.md for detailed information");
        
        process.exit(0);
    } else {
        console.log("\n❌ Some fonts are missing. Try running the build commands:");
        console.log("   npm run build:google-sans");
        console.log("   npm run build:jetbrains-mono"); 
        console.log("   npm run build:google-sans-variable");
        console.log("   npm run build:jetbrains-mono-variable");
        process.exit(1);
    }
}

testFonts().catch(error => {
    console.error("Test failed:", error.message);
    process.exit(1);
});
