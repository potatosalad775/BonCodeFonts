import { saveVariableFontInstance } from './variable-font-instance.mjs';

/**
 * Extract variable font instance - called by the build system
 */
export default async function extractVariableInstance(argv) {
    console.log(`Extracting variable font instance: ${argv.weight} from ${argv.input}`);
    
    if (!argv.input || !argv.output || !argv.weight) {
        throw new Error('Missing required parameters: input, output, weight');
    }
    
    await saveVariableFontInstance(
        argv.input,
        argv.output,
        argv.weight,
        argv.isItalic || false
    );
    
    console.log(`Variable font instance extraction completed: ${argv.output}`);
}
