// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
var vscode = require('vscode');
var Codealike = require('@codealike/codealike-core').Codealike;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {

    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    statusBarItem.command = "codealike.connect";
    statusBarItem.show();

    // if there is a folder loaded, initialize codealike
    if (vscode.workspace.rootPath) {

        // initialize plugin for current client and version
        Codealike.initialize('vscode', '0.0.4');

        // if user token configuration found, connect!
        if (Codealike.hasUserToken()) {
            // try to connect
            Codealike.connect()
                    .then(
                        () => { 
                            statusBarItem.text = "Codealike is connected"; 

                            startTrackingProject();
                        },
                        () => { 
                            statusBarItem.text = "Codealike is not connected"; 

                            stopTrackingProject();
                        }
                    );
        }
        else {
            statusBarItem.text = "Click here to configure Codealike";
        }
    }

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    //console.log('Congratulations, your extension "codealike-code" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    var disposable = vscode.commands.registerCommand('codealike.connect', function () {
        // The code you place here will be executed every time your command is executed

        // else, ask for codealike user token
        vscode.window.showInputBox({
            prompt: 'Your Codealike API Token',
            ignoreFocusOut: true,
            placeHolder: "Enter here your Codealike API token, or clean it to disconnect",
            value: Codealike.getUserToken()
        })
        .then(
            (token) => {
                // if user has pressed esc, do nothing
                if (token === undefined)
                    return;

                // set user token configuration
                Codealike.setUserToken(token);

                // try to connect
                if (token) {
                    Codealike.connect()
                        .then(
                            () => { 
                                statusBarItem.text = "Codealike is connected"; 
                                startTrackingProject();
                            },
                            () => { 
                                statusBarItem.text = "Codealike cannot connect"; 
                                stopTrackingProject();
                            }
                        );
                }
                else {
                    stopTrackingProject();
                    Codealike.disconnect();
                    statusBarItem.text = "Click here to configure Codealike";
                }
            }
        );

    });

    context.subscriptions.push(disposable);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
    return new Promise(function(resolve, reject) {
        Codealike.dispose();
        resolve();
    });
}
exports.deactivate = deactivate;

function stopTrackingProject() {
    Codealike.stopTracking();
}

function startTrackingProject() {
    // start tracking project
    Codealike
        .configure(vscode.workspace.rootPath)
        .then((configuration) => {
            // calculate when workspace started loading
            let currentDate = new Date();

            // start tracking project
            Codealike.startTracking(configuration, currentDate);
        });

    vscode.workspace.onDidChangeTextDocument((event) => {
        let lineAt = null;
        if (event.contentChanges.length && event.contentChanges[0].range.length) {
            lineAt = event.contentChanges[0].range[0].line;
        }

        let context = {
            file: event.document.fileName,
            line: lineAt
        };

        Codealike.trackCodingEvent(context);
    });

    vscode.window.onDidChangeTextEditorSelection((event) => {
        // TODO: pending to check events like cursor keys as focus

        // track mouse events as focus
        if (event.kind === 2) {
            let context = {
                file: event.textEditor._documentData._document.fileName,
                line: event.selections["0"].active.line
            };

            Codealike.trackFocusEvent(context);
        }
    });
}