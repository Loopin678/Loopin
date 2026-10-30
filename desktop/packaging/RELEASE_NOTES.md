## Download

| Your computer | File to download |
|---|---|
| Windows 10/11 | `LoopinSetup-<version>.exe` (installer) or `Loopin-<version>-windows-portable.zip` |
| macOS (Apple Silicon: M1 or newer) | `Loopin-<version>-macos-arm64.dmg` |
| Linux (64-bit) | `Loopin-<version>-x86_64.AppImage` |

You also need **Git** installed (https://git-scm.com/downloads); Loopin uses it for push, pull and merge.

## Install

**Windows:** run `LoopinSetup-<version>.exe`. If SmartScreen says "Windows protected your PC", click **More info → Run anyway** (the app isn't code-signed yet). Loopin then appears in the Start menu and on your desktop. To uninstall, use **Settings → Apps**.

**macOS:** open the `.dmg` and drag **Loopin** into **Applications**. The app isn't notarized yet, so the first time, **right-click Loopin → Open → Open**. If macOS says the app "is damaged", run this once in Terminal:

```
xattr -dr com.apple.quarantine /Applications/Loopin.app
```

**Linux:** make the file executable and run it:

```
chmod +x Loopin-*-x86_64.AppImage
./Loopin-*-x86_64.AppImage
```

On Ubuntu 22.04 and older you may need `sudo apt install libfuse2` first.

## First run

1. Sign in with GitHub.
2. Open your repository with **Browse**.
3. To link commits to Loopin tasks, open **Settings** and fill in the **Backend URL**, your **Project ID** and your **User ID** (copy both IDs from the Loopin website).
4. For AI commit grouping, pick a provider in **Settings** and paste your API key, or run Ollama locally.
