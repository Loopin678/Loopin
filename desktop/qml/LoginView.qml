import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import App

// Sign-in, styled like the website's auth pages (AuthLayout.tsx): the olive-to-
// chartreuse "dusk sky" with rolling hills behind a rounded dark card.
Item {
    id: root
    property var auth
    signal loggedIn(string token)
    property bool loginReady: false
    // Set while we wait for the user to type the device code on github.com
    property bool waitingForCode: false

    Component.onCompleted: {
        statusText.text = "Checking for saved login..."
        root.auth.checkSavedToken()
    }

    // ── Backdrop ────────────────────────────────────────────────────────
    Rectangle {
        anchors.fill: parent
        color: Theme.bg
    }

    Canvas {
        id: sky
        anchors { fill: parent; margins: 8 }
        onWidthChanged: requestPaint()
        onHeightChanged: requestPaint()
        onPaint: {
            var ctx = getContext("2d")
            ctx.reset()
            var w = width, h = height, r = 28

            // Clip to a rounded panel, like the website's hero frame
            ctx.beginPath()
            ctx.moveTo(r, 0); ctx.arcTo(w, 0, w, h, r); ctx.arcTo(w, h, 0, h, r)
            ctx.arcTo(0, h, 0, 0, r); ctx.arcTo(0, 0, w, 0, r); ctx.closePath()
            ctx.clip()

            var g = ctx.createLinearGradient(0, 0, 0, h)
            g.addColorStop(0.00, "#0B0C0A"); g.addColorStop(0.18, "#12170A")
            g.addColorStop(0.38, "#1F2A0E"); g.addColorStop(0.58, "#3A4D14")
            g.addColorStop(0.76, "#6F8A22"); g.addColorStop(0.88, "#A9C440")
            g.addColorStop(1.00, "#2A3410")
            ctx.fillStyle = g
            ctx.fillRect(0, 0, w, h)

            // Soft chartreuse glows
            function glow(cx, cy, rad, a) {
                var rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad)
                rg.addColorStop(0, "rgba(208,227,106," + a + ")")
                rg.addColorStop(1, "rgba(208,227,106,0)")
                ctx.fillStyle = rg
                ctx.fillRect(0, 0, w, h)
            }
            glow(w * 0.5, h * 1.0, w * 0.55, 0.45)
            glow(w * 0.25, h * 0.62, w * 0.28, 0.22)
            glow(w * 0.80, h * 0.50, w * 0.24, 0.14)

            // Hills
            function hill(cx, cy, rx, ry, color) {
                ctx.fillStyle = color
                ctx.beginPath()
                ctx.ellipse(cx - rx, cy - ry, rx * 2, ry * 2)
                ctx.fill()
            }
            hill(w * 0.18, h * 1.12, w * 0.40, h * 0.34, "#252D15")
            hill(w * 0.86, h * 1.10, w * 0.46, h * 0.28, "#1C2210")
            hill(w * 0.50, h * 1.22, w * 0.72, h * 0.30, "#0B0C0A")
        }
    }

    // ── Content ─────────────────────────────────────────────────────────
    ColumnLayout {
        id: content
        anchors.centerIn: parent
        width: Math.min(400, root.width - 48)
        spacing: 0
        opacity: 0
        transform: Translate { id: rise; y: 18 }

        ParallelAnimation {
            running: true
            NumberAnimation { target: content; property: "opacity"; to: 1; duration: 700; easing.type: Easing.OutCubic }
            NumberAnimation { target: rise; property: "y"; to: 0; duration: 700; easing.type: Easing.OutCubic }
        }

        LoopinMark {
            Layout.alignment: Qt.AlignHCenter
            size: 40
        }

        Text {
            Layout.alignment: Qt.AlignHCenter
            Layout.topMargin: 22
            text: root.waitingForCode ? "Enter your code" : "Welcome back"
            color: "white"
            font.family: Theme.fontFamily
            font.pixelSize: 34
            font.weight: Font.DemiBold
            font.letterSpacing: -0.8
        }

        Text {
            Layout.alignment: Qt.AlignHCenter
            Layout.topMargin: 8
            Layout.fillWidth: true
            horizontalAlignment: Text.AlignHCenter
            wrapMode: Text.WordWrap
            text: root.waitingForCode
                  ? "A browser window opened. Enter this code on GitHub to link Loopin Desktop."
                  : "Sign in to sync your commits with your Loopin board."
            color: Qt.rgba(1, 1, 1, 0.75)
            font.pixelSize: 14
        }

        // Card
        Rectangle {
            Layout.fillWidth: true
            Layout.topMargin: 26
            implicitHeight: cardCol.implicitHeight + 48
            radius: 28
            color: Qt.rgba(11 / 255, 12 / 255, 10 / 255, 0.88)
            border.width: 1
            border.color: Theme.border

            ColumnLayout {
                id: cardCol
                anchors { left: parent.left; right: parent.right; top: parent.top; margins: 24 }
                spacing: 14

                // Device code (shown after pressing the button)
                Rectangle {
                    Layout.fillWidth: true
                    visible: root.waitingForCode
                    implicitHeight: 64
                    radius: Theme.radius + 2
                    color: Theme.accentSoft
                    border.width: 1
                    border.color: Theme.accentLine
                    Text {
                        id: codeText
                        anchors.centerIn: parent
                        color: Theme.accent
                        font.family: Theme.monoFamily
                        font.pixelSize: 28
                        font.weight: Font.Medium
                        font.letterSpacing: 4
                    }
                }

                Text {
                    id: instructions
                    Layout.fillWidth: true
                    visible: root.waitingForCode
                    horizontalAlignment: Text.AlignHCenter
                    wrapMode: Text.WordWrap
                    color: Theme.textSecondary
                    font.pixelSize: 13
                }

                // Lime pill, like the website's primary CTA
                Button {
                    id: loginBtn
                    Layout.fillWidth: true
                    visible: root.loginReady
                    text: root.waitingForCode ? "Open GitHub again" : "Continue with GitHub"
                    highlighted: true
                    font.pixelSize: 14
                    font.weight: Font.DemiBold
                    topPadding: 11; bottomPadding: 11
                    background: Rectangle {
                        radius: height / 2
                        color: loginBtn.down ? Theme.accentPress : (loginBtn.hovered ? Theme.accentHover : Theme.accent)
                    }
                    onClicked: root.auth.startLogin()
                }

                Text {
                    id: statusText
                    Layout.fillWidth: true
                    horizontalAlignment: Text.AlignHCenter
                    wrapMode: Text.WordWrap
                    visible: text.length > 0
                    color: statusText.text.indexOf("failed") >= 0 ? Theme.danger : Theme.textSecondary
                    font.pixelSize: 13
                }
            }
        }

        Text {
            Layout.alignment: Qt.AlignHCenter
            Layout.topMargin: 18
            text: "Your token stays on this computer."
            color: Qt.rgba(1, 1, 1, 0.55)
            font.pixelSize: 12
        }
    }

    Connections {
        target: root.auth
        function onNoSavedToken() {
            statusText.text = ""
            root.loginReady = true
        }
        function onUserCodeReady(userCode, verificationUri) {
            root.waitingForCode = true
            codeText.text = userCode
            instructions.text = "Enter it at " + verificationUri
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
