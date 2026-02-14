#!/bin/bash
# EAS Build hook: copy GoogleService-Info.plist from EAS secret into project root
# The secret GOOGLE_SERVICES_PLIST is set via: eas secret:create

if [ -n "$GOOGLE_SERVICES_PLIST" ]; then
  echo "Copying GoogleService-Info.plist from EAS secret..."
  cp "$GOOGLE_SERVICES_PLIST" ./GoogleService-Info.plist
  echo "Done."
else
  echo "WARNING: GOOGLE_SERVICES_PLIST secret not found. Firebase may not work."
fi
