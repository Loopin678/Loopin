import QtQuick
import QtQuick.Controls

Item {
    id: root
    property var auth
    signal loggedIn(string token)

    Column {
        anchors.centerIn: parent
        spacing: 16
        width: 420

        Text {
            text: "Sign in with GitHub"
            font.pixelSize: 22
            font.bold: true
        }

        Button {
            text: "Login with GitHub"
            width: parent.width
            onClicked: root.auth.startLogin()
        }

        Text {
            id: instructions
            wrapMode: Text.WordWrap
            width: parent.width
            visible: text.length > 0
        }

        Text {
            id: statusText
            color: statusText.text.indexOf("failed") >= 0 ? "#c0392b" : "#2c3e50"
        }
    }

    Connections {
        target: root.auth
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
