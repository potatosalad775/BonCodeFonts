# Korean Hybrid Coding Font Project Instructions

This project creates automated hybrid fixed-width coding fonts by merging popular Latin-only coding fonts with Sarasa Fixed Korean characters to fill missing Korean glyphs.

## Project Overview

**Goal**: Generate hybrid coding fonts that combine:
- Latin/ASCII characters from popular coding fonts (Google Sans Code, JetBrains Mono, Fira Code, etc.)
- Korean characters from Sarasa Fixed K (pre-optimized for monospace coding)
- Maintain fixed-width characteristics for coding use

**Architecture**: Follow the Sarasa-Gothic model for automated font generation and deployment via GitHub Actions.

# Korean Hybrid Coding Font Project Instructions

This project creates automated hybrid fixed-width coding fonts by merging popular Latin-only coding fonts with Sarasa Fixed Korean characters to fill missing Korean glyphs.

## Project Overview

**Goal**: Generate hybrid coding fonts that combine:
- Latin/ASCII characters from popular coding fonts (Google Sans Code, JetBrains Mono, Fira Code, etc.)
- Korean characters from Sarasa Fixed K (pre-optimized for monospace coding)
- Maintain fixed-width characteristics for coding use

**Architecture**: Follow the Sarasa-Gothic model for automated font generation and deployment via GitHub Actions.

## Key Requirements

### 1. Font Sources & Licensing
- **Primary Latin font**: Google Sans Code (SIL Open Font License)
  - Available weights: Light, Regular, SemiBold, Bold
  - Full italic variants available
  - Designed specifically for coding environments
  - **Location**: `sources/GoogleSansCode/` (included in repository)
- **Korean font**: Sarasa Fixed K (SIL Open Font License)
  - Pre-optimized for monospace coding
  - Battle-tested in developer environments
  - Compatible italic variants available
  - **Location**: `sources/SarasaFixedK/` (included in repository)
- **License compatibility**: All use SIL OFL, ensuring derivative work compatibility

### 2. Build System Structure
```
project/
├── sources/                    # Source font files (included in repository)
│   ├── GoogleSansCode/        # Google's coding font (primary target)
│   │   ├── GoogleSansCode-Regular.ttf
│   │   ├── GoogleSansCode-Italic.ttf
│   │   ├── GoogleSansCode-Bold.ttf
│   │   └── ... (all available weights)
│   └── SarasaFixedK/          # Sarasa Fixed Korean source fonts
├── config/                    # Font configuration files
│   ├── base-config.json       # Main configuration
│   ├── google-sans-profile.json # Google Sans Code specific settings
│   └── unicode-ranges.json    # Korean character mappings
├── build/                     # Build scripts and tools
│   ├── extract-sarasa-k.mjs   # Extract Korean glyphs from Sarasa Fixed K
│   ├── merge-fonts.mjs        # Core font merging logic
│   ├── adjust-metrics.mjs     # Monospace width adjustments
│   └── generate-variants.mjs   # Style variant generation
├── .github/workflows/         # GitHub Actions
│   ├── build-fonts.yml       # Main build workflow
│   └── release.yml            # Release automation
└── out/                       # Generated font outputs
    └── ... (all variants)
```

### 3. Font Merging Process

**Phase 1: Korean Glyph Extraction**
- Extract Korean glyphs from Sarasa Fixed K
- Target specific Unicode ranges (see Unicode Strategy section)
- Preserve monospace metrics and italic variants
- Validate glyph completeness for Korean text rendering

**Phase 2: Google Sans Code Analysis**
- Analyze Google Sans Code metrics:
  - Monospace width (typically 600 units)
  - x-height, ascender, descender values
  - Baseline alignment
  - Weight-specific characteristics
- Create Google Sans Code adjustment profile

**Phase 3: Intelligent Merging**
- Merge glyph sets with Google Sans Code taking priority for Latin ranges
- Insert Korean glyphs from Sarasa Fixed K for Korean ranges
- Adjust Korean glyph positioning within Google Sans Code's monospace cell
- Ensure consistent baseline alignment between Latin and Korean characters
- Handle edge cases (punctuation overlap, mathematical symbols)

**Phase 4: Quality Assurance & Output**
- Validate monospace compliance across all glyphs
- Test Korean text rendering in various coding environments
- Generate all weight variants (Light through ExtraBold)
- Create both regular and italic variants
- Output TTF and WOFF2 formats

### 4. Unicode Range Strategy

**Korean Character Ranges to Extract from Sarasa Fixed K**:
```javascript
const koreanRanges = {
  // Core Korean text - PRIORITY 1
  hangulSyllables: {
    range: "U+AC00-U+D7AF",     // 완성형 한글 (11,172 syllables)
    description: "Complete Korean syllables",
    required: true
  },
  
  hangulJamo: {
    range: "U+1100-U+11FF",     // 초성, 중성, 종성
    description: "Hangul Jamo components",
    required: true
  },
  
  hangulCompatJamo: {
    range: "U+3130-U+318F",     // 반각 자모
    description: "Hangul compatibility Jamo",
    required: true
  },
  
  // Korean punctuation & symbols - PRIORITY 2
  cjkPunctuation: {
    range: "U+3000-U+303F",     // Korean-specific punctuation
    description: "CJK punctuation (selective)",
    required: false,
    selective: [
      "U+3000", // Ideographic space
      "U+3001", // Ideographic comma
      "U+3002", // Ideographic period
      "U+300C", // Left corner bracket
      "U+300D", // Right corner bracket
      "U+300E", // Left white corner bracket  
      "U+300F"  // Right white corner bracket
    ]
  },
  
  halfwidthForms: {
    range: "U+FF00-U+FFEF",     // 반각 문자
    description: "Halfwidth forms (selective Korean punctuation)",
    required: false,
    selective: [
      "U+FF61", // Halfwidth ideographic period
      "U+FF62", // Halfwidth left corner bracket
      "U+FF63"  // Halfwidth right corner bracket
    ]
  },
  
  // Technical symbols - PRIORITY 3  
  cjkSymbols: {
    range: "U+3200-U+32FF",     // Enclosed CJK letters
    description: "Korean parenthesized/circled characters",
    required: false
  }
};

// Exclusion strategy
const excludeRanges = {
  basicLatin: "U+0000-U+007F",        // Covered by Google Sans Code
  latinExtended: "U+0080-U+024F",     // Covered by Google Sans Code  
  mathOperators: "U+2200-U+22FF",     // Keep Google Sans Code version
  geometricShapes: "U+25A0-U+25FF"    // Keep Google Sans Code version
};
```

### 5. Configuration Schema

**Google Sans Code Profile** (`config/google-sans-profile.json`):
```json
{
  "fontFamily": "GoogleSansCode",
  "outputPrefix": "BonCodeGoogleSans",
  "monoWidth": 600,
  "metrics": {
    "unitsPerEm": 1000,
    "ascender": 750,
    "descender": -250,
    "lineGap": 100,
    "xHeight": 500,
    "capHeight": 700
  },
  "weights": {
    "Light": { "usWeightClass": 300, "available": true },
    "Regular": { "usWeightClass": 400, "available": true },
    "Medium": { "usWeightClass": 500, "available": true },
    "SemiBold": { "usWeightClass": 600, "available": true },
    "Bold": { "usWeightClass": 700, "available": true },
    "ExtraBold": { "usWeightClass": 800, "available": true }
  },
  "koreanAdjustments": {
    "scaleX": 1.0,
    "scaleY": 1.0,
    "offsetX": 0,
    "offsetY": 0,
    "baselineShift": 0
  },
  "features": {
    "preserveLigatures": false,
    "preserveKerning": true,
    "addKoreanFeatures": true
  }
}
```

### 6. Implementation Priority

1. **✅ Completed**: Google Sans Code + Sarasa Fixed K
   - All 4 available weights (Light, Regular, SemiBold, Bold)
   - Both regular and italic variants
   - Proper coordinate system scaling (1000→2000 unitsPerEm)
   - Validated in coding environments (VS Code, IntelliJ, etc.)

2. **Future Phase**: Additional Latin fonts
   - JetBrains Mono + Sarasa Fixed K
   - Fira Code + Sarasa Fixed K  
   - Create font-specific adjustment profiles

3. **Future Phase**: Advanced features
   - WOFF2 format generation
   - Ligature handling strategy
   - Performance optimizations
   - Advanced Korean typography features

### 7. Quality Validation

**Automated Tests**:
- Monospace width validation for all glyphs
- Korean character coverage verification (11,172+ syllables)
- Font metadata correctness
- Cross-platform rendering tests (macOS, Windows, Linux)

**Manual Review Checkpoints**:
- Korean-Latin baseline alignment
- Visual weight consistency across character sets
- Coding environment compatibility (VS Code, terminals, IDEs)
- Korean text readability at various sizes (12px-24px)

This streamlined approach focuses on creating high-quality hybrid fonts using proven components (Google Sans Code + Sarasa Fixed K) while maintaining the flexibility to expand to other Latin fonts in the future.