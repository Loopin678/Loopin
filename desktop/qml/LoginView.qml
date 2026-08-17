import QtQuick
import QtQuick.Controls
import App

Item {
    id: root
    property var auth
    signal loggedIn(string token)
    property bool loginReady: false

    Component.onCompleted: {
        statusText.text = "Checking for saved login..."
        root.auth.checkSavedToken()
    }

    Rectangle {
        anchors.fill: parent
        color: Theme.bg
    }

    Column {
        anchors.centerIn: parent
        spacing: 16
        width: 420

        Text {
            text: "Sign in with GitHub"
            font.pixelSize: 22
            font.bold: true
            visible: root.loginReady
            color: Theme.textPrimary
        }

        Button {
            text: "Login with GitHub"
            width: parent.width
            onClicked: root.auth.startLogin()
            visible: root.loginReady
        }

        Text {
            id: instructions
            wrapMode: Text.WordWrap
            width: parent.width
            visible: text.length > 0 && root.loginReady
            color: Theme.textSecondary
        }

        Text {
            id: statusText
            color: statusText.text.indexOf("failed") >= 0 ? Theme.danger : Theme.textSecondary
        }
    }

    Connections {
        target: root.auth
        function onNoSavedToken() {
            statusText.text = ""
            root.loginReady = true
        }
        function onUserCodeReady(userCode, verificationUri) {
            instructions.text = "A browser window opened. Enter this code at "
                + verificationUri + ":\n\n" + userCode
        }
        function onAuthenticated(token) {
            statusText.text = "Signed in."
            root.loggedIn(token)
        }
        function onAuthFailed(error) {
            statusText.text = "Login failed: " + error
        }
    }
}
