#!/bin/sh
# Hosted build for GitHub Pages: site/index.html plus icons and manifest
set -e
OUT=../index.html

{
  echo '<!doctype html><html lang="en"><head><meta charset="utf-8">'
  cat web/head-extra.html
  cat src/01-head.html
  echo '</head><body>'
  echo '<div id="app"></div>'
  echo '<script src="https://cdn.jsdelivr.net/npm/preact@10.19.3/dist/preact.umd.js"></script>'
  echo '<script src="https://cdn.jsdelivr.net/npm/preact@10.19.3/hooks/dist/hooks.umd.js"></script>'
  echo '<script src="https://cdn.jsdelivr.net/npm/htm@3.1.1/dist/htm.umd.js"></script>'
  echo '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"></script>'
  echo '<script>'
  echo '"use strict";'
  cat src/02-core.js src/03-charts.js src/04-ui.js src/05-today.js src/06-tracker.js src/07-goals.js src/08-todo.js src/09-calendar.js src/10-notes.js
  # demo data without personal names (the repo is public)
  sed -e "s/Lunch with Chinmoy/Lunch with a mentor/g" -e "s/Chinmoy/a mentor/g" -e "s/Interarch/valuation/g" -e "s/Bain mock/Case mock/g" -e "s/A&M/Internship/g" -e "s/Placecom/Team/g" src/11-demo.js
  cat web/supa.js
  cat src/12-app.js
  echo '</script></body></html>'
} > $OUT
cp web/icon.svg web/manifest.webmanifest ../
touch ../.nojekyll
wc -c $OUT
