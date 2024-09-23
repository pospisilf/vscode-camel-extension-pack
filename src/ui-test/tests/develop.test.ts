/**
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License", destination); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as path from 'path';
import { ActivityBar, Breakpoint, DebugView, EditorView, InputBox, SideBarView, TextEditor, VSBrowser, WebDriver } from "vscode-uitests-tooling";
import { assert } from 'chai';
import { activateEditor, deleteFolderContents, disconnectDebugger, executeCommand, killTerminal, openFileInEditor, waitUntilEditorIsOpened, waitUntilTerminalHasText } from '../utils';
import { QUARKUS_DIR } from '../variables';

describe.only('Quarkus', function () {
    this.timeout(90000);

    let driver: WebDriver;
    let textEditor: TextEditor;

    before(async function () {
        driver = VSBrowser.instance.driver
        
        await VSBrowser.instance.openResources(QUARKUS_DIR);
        await deleteFolderContents(QUARKUS_DIR);

        await (await new ActivityBar().getViewControl('Explorer')).openView();
        await new SideBarView().getContent().getSection('quarkus');

        await workaround(driver);
    });

    after(async function () {
        await disconnectDebugger(driver);
        await (await new ActivityBar().getViewControl('Run and Debug')).closeView();
        await killTerminal();
        await new EditorView().closeAllEditors();
        await deleteFolderContents(QUARKUS_DIR);
    });

    it('Quarkus', async function () {

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
        await executeCommand('Camel: Create a Camel Quarkus project');
        await driver.wait(async function () {
            input = await InputBox.create();
            return (await input.isDisplayed());
        }, 30000);
        await input?.confirm(); // confirm name
        await waitUntilTerminalHasText(driver, ['Terminal will be reused by tasks, press any key to close it.']);

        // Open created Quarkus file
        await new EditorView().closeAllEditors();
        await openFileInEditor(driver, path.join(QUARKUS_DIR, 'src', 'main', 'java', 'com', 'acme', 'myproject'), 'Demo.java');
        textEditor = await activateEditor(driver, 'Demo.java');
        assert.isNotNull(textEditor);

        //textEditor = new TextEditor();

        await driver.wait(async function () {
            return await textEditor.toggleBreakpoint(12);
        }, 5000);

        const btn = await new ActivityBar().getViewControl('Run');
        const debugView = (await btn.openView()) as DebugView;

        const configs = await debugView.getLaunchConfigurations();
        assert.isTrue(configs.includes("Run Camel Quarkus JVM application and attach Camel debugger"));

        await debugView.selectLaunchConfiguration("Run Camel Quarkus JVM application and attach Camel debugger");
        await debugView.start();

        const breakpoint = await driver.wait<Breakpoint>(async () => {
            return await textEditor.getPausedBreakpoint();
        }, 30000, undefined, 500) as Breakpoint;

       assert.isTrue(await breakpoint.isPaused());
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