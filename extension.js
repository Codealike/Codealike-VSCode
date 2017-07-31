// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
var vscode = require('vscode');
var Codealike = require('@codealike/codealike-core').Codealike;

function verifyConfigurationAndConnect() {
    let codealikeConfig = vscode.workspace.getConfiguration('codealike');

    if (!codealikeConfig && !codealikeConfig.userToken) {
        Codealike.disconnect();
        vscode.window.showInformationMessage("Codealike is disconnected.");

        askForUserToken();
    }
    else {
        let token = codealikeConfig.userToken;
        
        Codealike.connect(token).then(
        (result) => {
            vscode.window.showInformationMessage("Codealike is connected.");
          
            if (vscode.workspace.rootPath) {
                Codealike
                    .configure(vscode.workspace.rootPath)
                    .then((configuration) => {
                        // calculate when workspace started loading
                        let currentDate = new Date();

                        // start tracking project
                        Codealike.startTracking(configuration, currentDate);
                    });
            }
        },
        (error) => {
            askForUserToken(codealikeConfig);
          //vscode.window.showErrorMessage("Codealike couldn't connect with provided token. Please review it in the File > Preferences > Settings option.");
        }
      );
    }
}

function askForUserToken(config) {
    vscode.window.showInputBox({
        prompt: 'Codealike User Token',
        ignoreFocusOut: true,
        placeHolder: "Please enter your Codealike user token",
        value: ""
    })
    .then(
        (token) => {
            config.update('userToken', token, true);
        }
    );
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    Codealike.initialize('vscode');

    // try to connect at startup
    verifyConfigurationAndConnect();

    vscode.workspace.onDidChangeConfiguration(() => {
        verifyConfigurationAndConnect();
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

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    //console.log('Congratulations, your extension "codealike-code" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    var disposable = vscode.commands.registerCommand('extension.sayHello', function () {
        // The code you place here will be executed every time your command is executed

        // Display a message box to the user
        //vscode.window.showInformationMessage('Hello World!');
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