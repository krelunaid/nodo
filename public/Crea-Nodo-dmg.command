#!/bin/bash
# Esegui questo SUL MAC, nella cartella Download (accanto a Nodo-2).
cd "$(dirname "$0")"
APP=""
for n in "Nodo-2.app" "Nodo.app" "Nodo-2" "Nodo"; do
  if [ -d "$n" ] || [ -e "$n" ]; then APP="$n"; break; fi
done
if [ -z "$APP" ]; then
  APP=$(find "$HOME/Downloads" -maxdepth 1 -name "Nodo*.app" | head -1)
fi
if [ -z "$APP" ]; then
  osascript -e 'display dialog "Non trovo Nodo.app. Metti questo file nella cartella Download, accanto a Nodo-2." buttons {"OK"}'
  exit 1
fi
DEST="$HOME/Downloads/Nodo.dmg"
rm -f "$DEST"
hdiutil create -volname "Nodo" -srcfolder "$APP" -ov -format UDZO "$DEST"
open -R "$DEST"
osascript -e 'display dialog "Pronto: Nodo.dmg è in Download. Doppio clic, poi trascina Nodo in Applicazioni." buttons {"OK"}'
