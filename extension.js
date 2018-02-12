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
        statusBarItem.text = "Codealike is initializing...";

        // initialize plugin for current client and version
        Codealike.initialize('vscode', '0.0.20');

        Codealike.registerStateSubscriber((state) => {
            if (state.isTracking) {
                if (state.networkStatus === 'OnLine') {
                    statusBarItem.text = "Codealike is tracking on-line";
                }
                else {
                    statusBarItem.text = "Codealike is tracking off-line";
                }
            }
            else {
                statusBarItem.text = "Click here to configure Codealike";
            }
        });

        // try to connect
        Codealike.connect()
                .then(
                    () => { 
                        startTrackingProject();
                    },
                    () => { 
                        stopTrackingProject();
                    }
                );
        
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
                                startTrackingProject();
                            },
                            () => { 
                                stopTrackingProject();
                            }
                        );
                }
                else {
                    stopTrackingProject();
                    Codealike.disconnect();
                }
            }
        );

    });

    context.subscriptions.push(disposable);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
    setTimeout(function() {
        Codealike.dispose();
    }, 0);

    return undefined;
}
exports.deactivate = deactivate;

function stopTrackingProject() {
    Codealike.stopTracking();
}

function startTrackingProject() {
    // start tracking project
    Codealike
        .configure(vscode.workspace.rootPath)
        .then(
            (configuration) => {
                // calculate when workspace started loading
                let currentDate = new Date();

                // start tracking project
                Codealike.startTracking(configuration, currentDate);
            },
            (error) => {
                vscode.window.showErrorMessage(error);
            }
    );

    vscode.debug.onDidStartDebugSession((event) => {
        Codealike.trackDebuggingState();
    });

    vscode.debug.onDidTerminateDebugSession((event) => {
        Codealike.trackCodingState();
    });

    vscode.workspace.onDidChangeTextDocument((event) => {
        //let lineAt = null;
        //if (event.contentChanges.length) {
        //    lineAt = event.document.positionAt().line;
        //}

        vscode
            .commands
            .executeCommand('vscode.executeDocumentSymbolProvider', event.document.uri)
            .then(function(result) {
                if (!event.contentChanges || event.contentChanges.length == 0)
                    return;

                var line = event.contentChanges[0].range._start._line;
                var className = null;
                var member = null;

                result.forEach(function(element) {
                    if (!element || element.location.range._start.line > line)
                        return;

                    if (element.kind == vscode.SymbolKind.Class) {
                        className = element.name;
                    }

                    if (element.kind == vscode.SymbolKind.Method) {
                        member = element.name;
                    }

                }, this);

                let context = {
                    file: event.document.fileName,
                    line: line,
                    className: className,
                    member: member
                }

                Codealike.trackCodingEvent(context);
            }, 
            function(error) {
                console.warn("Error trying to track coding event", error);
            }
        );
    });

    vscode.window.onDidChangeTextEditorSelection((event) => {
        // TODO: pending to check events like cursor keys as focus
        if (event.kind === 2) {
            vscode
                .commands
                .executeCommand('vscode.executeDocumentSymbolProvider', event.textEditor.document.uri)
                .then(function(result) {
                    if (!event.selections || event.selections.length == 0)
                        return;

                    var line = event.selections[0]._active._line;
                    var className = null;
                    var member = null;

                    result.forEach(function(element) {
                        if (!element || element.location.range._start.line > line)
                            return;

                        if (element.kind == vscode.SymbolKind.Class) {
                            className = element.name;
                        }

                        if (element.kind == vscode.SymbolKind.Method) {
                            member = element.name;
                        }

                    }, this);

                    let context = {
                        file: event.textEditor.document.fileName,
                        line: line,
                        className: className,
                        member: member
                    }

                    Codealike.trackFocusEvent(context);
                }, 
                function(error) {
                    console.warn("Error trying to track focus event", error);
                }
            );
        }
    });
}