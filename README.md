# Bon-Code-Fonts

Hybrid fixed-width monospace coding fonts, blended with popular Latin coding fonts and `Bon Gothic - 본고딕`.

## Overview

`Bon-Code-Fonts` automatically merge:
- **Latin characters** from popular coding fonts (supports both static and variable fonts)
- **Korean characters** from `Sarasa Fixed K` (Fixed-width monospace font, based on `Source Han Sans - 본고딕`)

## Available Fonts

| Name             | Flavor                              | Weights                      |
|------------------|-------------------------------------|------------------------------|
|Bon-GoogleSansCode|`Google Sans Code` + `Sarasa Fixed K`|Light, Regular, Bold          |
|Bon-JetBrainsMono |`JetBrains Mono` + `Sarasa Fixed K`  |Light, Regular, SemiBold, Bold|

Each font contains Regular and Italic styles.

## Quick Start

### Download Pre-built Fonts
1. Go to [Releases](../../releases)
2. Download the latest `BonCodeFonts-TTF-*.zip`
3. Extract and install the `.ttf` files
4. Use "Bon Google Sans Code" in your editor

### Build from Source
```bash
# Clone repository
git clone https://github.com/potatosalad775/BonCodeFonts.git
cd BonCodeFonts

# Install dependencies  
npm install

# Build static fonts
npm run build:google-sans
npm run build:jetbrains-mono

# Build variable fonts (recommended)
npm run build:google-sans-variable
npm run build:jetbrains-mono-variable

# Test the output
npm test
```

**Note**: This repository includes all necessary source fonts (Google Sans Code and Sarasa Fixed K) under the SIL Open Font License. See [SETUP.md](SETUP.md) for detailed build instructions.

## Usage in Popular Editors

### VS Code
```json
{
  "editor.fontFamily": "Bon Google Sans Code, 'Courier New', monospace",
  "editor.fontSize": 14
}
```

### IntelliJ IDEA
1. Go to Settings → Editor → Font
2. Select "Bon Google Sans Code" as Primary font

### Terminal
```bash
# iTerm2 / Terminal.app
# Go to Preferences → Profiles → Text
# Select "Bon Google Sans Code" as font
```

## Generating Fonts

See [SETUP.md](SETUP.md) for more information.

## License

- **Sarasa Gothic**: SIL Open Font License 1.1
- **Google Sans Code**: SIL Open Font License 1.1  
- **Bon-Code-Fonts**: SIL Open Font License 1.1

See `LICENSE` file in `/sources/*` for full license text.