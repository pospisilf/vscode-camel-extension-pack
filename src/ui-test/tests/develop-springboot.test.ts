import * as path from 'path';
import { ActivityBar, Breakpoint, DebugView, DefaultWait, EditorView, InputBox, SideBarView, TextEditor, VSBrowser, WebDriver } from "vscode-uitests-tooling";
import { assert } from 'chai';
import { activateEditor, deleteFolderContents, disconnectDebugger, executeCommand, killTerminal, openFileInEditor, waitUntilEditorIsOpened, waitUntilTerminalHasText } from '../utils';
import { QUARKUS_DIR, SPRINGBOOT_DIR } from '../variables';

describe.skip('Springboot', function () {
    this.timeout(9999999);

    let driver: WebDriver;
    let textEditor: TextEditor;

    before(async function () {
        driver = VSBrowser.instance.driver
        
        await VSBrowser.instance.openResources(SPRINGBOOT_DIR);
        await deleteFolderContents(SPRINGBOOT_DIR);

        await (await new ActivityBar().getViewControl('Explorer')).openView();
        await new SideBarView().getContent().getSection('springboot');

        await workaround(driver);
    });

    // after(async function () {
    //     await disconnectDebugger(driver);
    //     await (await new ActivityBar().getViewControl('Run and Debug')).closeView();
    //     await killTerminal();
    //     await new EditorView().closeAllEditors();
    //     await deleteFolderContents(SPRINGBOOT_DIR);
    // });

    it('springboot', async function () {
        console.log("tramtarara debile")

               // Create Camel route with name 'Demo.java'
               await executeCommand('Camel: Create a Camel Route using Java DSL');
               let input: InputBox | undefined;
               await driver.wait(async function () {
                   input = await InputBox.create();
                   return (await input.isDisplayed());
               }, 30000);
               await input?.setText("Demo");
               await input?.confirm();
               await waitUntilEditorIsOpened(driver, 'Demo.java');

                // Create a Camel Quarkus project
        await executeCommand('Camel: Create a Camel on SpringBoot project');
        await driver.wait(async function () {
            input = await InputBox.create();
            return (await input.isDisplayed());
        }, 30000);
        await input?.confirm(); // confirm name
        await waitUntilTerminalHasText(driver, ['Terminal will be reused by tasks, press any key to close it.']);

        // Open created springboot file
        await new EditorView().closeAllEditors();


        await VSBrowser.instance.openResources(path.join(path.join(SPRINGBOOT_DIR, 'src', 'main', 'java', 'com', 'acme', 'myproject'), 'Demo.java')); 
       
       
        textEditor = new TextEditor();

        await driver.wait(async function () {
            return await textEditor.toggleBreakpoint(15);
        }, 5000);

        const btn = await new ActivityBar().getViewControl('Run');
        const debugView = (await btn.openView()) as DebugView;

        const configs = await debugView.getLaunchConfigurations();
        assert.isTrue(configs.includes("Run Camel Spring Boot application and attach Camel debugger"));

        await debugView.selectLaunchConfiguration("Run Camel Spring Boot application and attach Camel debugger");
        await debugView.start();

        const breakpoint = await driver.wait<Breakpoint>(async () => {
            return await textEditor.getPausedBreakpoint();
       }, 30000, undefined, 500) as Breakpoint;
 
       assert.isTrue(await breakpoint.isPaused());
       // textEditor = await activateEditor(driver, 'Demo.java');
       // assert.isNotNull(textEditor);



      //  await DefaultWait.sleep(9999999);
               //Create a camel route
// Create a Camel Spring boot project
// Place breakpoint
// Use launch config to start with Camel debug
// Check breakpoint is hit

    });
});

/**
 * Provide workaround for Language Support for Java bug. 
 * @param driver Active WebDriver isntance.
 */
async function workaround(driver: WebDriver): Promise<void>{
    await executeCommand('Preferences: Open Workspace Settings (JSON)');
    await waitUntilEditorIsOpened(driver, 'settings.json');
    const editor = new TextEditor();
    const newJson = addNewItemToRawJson(await editor.getText(), "java.project.sourcePaths", ["src/main/java"]);
    await editor.setText(newJson);
    await editor.save();
    await new EditorView().closeEditor("settings.json");
}

/**
 * Adds a new key-value pair to a raw JSON string.
 * @param jsonStr The raw JSON string that will be modified.
 * @param key The new key to be added to the JSON object.
 * @param values An array of strings representing the values to be assigned to the new key.
 * @returns Updated JSON string with the new key-value pair added or Error.
 */
function addNewItemToRawJson(jsonStr: string, key: string, values: string[]): string {
    try {
        // Parse the JSON string into an object
        let config = JSON.parse(jsonStr);

        // Add the new key-value pair
        config[key] = values;

        // Convert the object back to a JSON string
        const updatedJsonStr = JSON.stringify(config, null, 4); // Adds indentation

        return updatedJsonStr;
    } catch (error) {
        console.error("Error parsing or updating JSON:", error);
        return jsonStr; // Return the original JSON in case of error
    }
}