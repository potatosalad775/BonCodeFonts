# Bon-Code-Fonts - Simple Setup Guide

This repository contains everything needed to build hybrid Korean coding fonts. **No external downloads required** - all source fonts are included under the SIL Open Font License.

## What's Included

### Source Fonts (Already in Repository)
- **Google Sans Code**: `sources/GoogleSansCode/`
- **JetBrains Mono**: `sources/JetBrainsMono/`
- **Geist Mono**: `sources/GeistMono/`
- **Sarasa Fixed K**: `sources/SarasaFixedK/`
  - Korean characters optimized for monospace
  - Matching weights and styles

### Build System
- **Node.js scripts** with Verda build orchestration
- **Configuration-driven** font merging process
- **Automated testing** and validation
- **GitHub Actions** for CI/CD

## Quick Start

```bash
# Install dependencies
npm install

# Build hybrid fonts
npm run build:google-sans

# Test output
npm test

# Clean build files
npm run clean
```

## Output

The build generates hybrid font files in `out/` folder.

## How It Works

1. **Extract Korean glyphs** from `Sarasa Fixed K` fonts
2. **Scale glyphs** to match `Google Sans Code` coordinate system
3. **Merge character maps** while preserving monospace widths
4. **Generate hybrid fonts** with complete Latin + Korean coverage

## Configuration

All settings are in `config/base-config.json`:
- Font metrics and coordinate systems
- Korean glyph scaling parameters  
- Unicode range definitions
- Output format preferences

No manual configuration needed for standard use cases.

## Variable Font Support

Variable fonts contain multiple weights in a single file, allowing for more precise weight matching and smaller file sizes.

Bon-Code-Fonts project use `fonttools` python script to extract precise weight instances from variable fonts. You can install `fonttools` with the command below:

```bash
# Install fonttools for proper variable font instantiation
brew install fonttools
# or..
pip install fonttools
```

If you don't have `fonttools` installed, Bon-Code-Fonts will use the default instance of the variable font (usually Regular/400 weight) anyway.

Variable fonts use a slightly different configuration structure in `base-config.json`:

```json
{
  "FontNameVariable": {
    "isVariable": true,
    "variableFontFiles": {
      "regular": "FontName[wght].ttf",
      "italic": "FontName-Italic[wght].ttf"
    },
  }
}
```

