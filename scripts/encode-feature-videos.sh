#!/usr/bin/env bash
# Re-encode landing feature-card loops from the 4K source WebMs.
# Requires ffmpeg (libvpx-vp9, libx264) and the repo's sharp install.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
out_dir="$root/public/assets/landing/features"
downloads="${FEATURE_VIDEO_SRC_DIR:-$HOME/Downloads}"

# Source renders include a 1px dark matte on the frame edge; cropping it
# before scale stops lanczos from bleeding that line into the output.
# Keep the source 60fps — dropping to 30 introduced judder on these loops.
scale="crop=in_w-16:in_h-16:8:8,scale=720:720:flags=lanczos,format=yuv420p"
poster_vf="crop=in_w-16:in_h-16:8:8,scale=720:720:flags=lanczos"
color=(-colorspace bt709 -color_primaries bt709 -color_trc bt709)
wide_vf="crop=in_w-16:in_h-16:8:8,scale=1424:692:flags=lanczos:force_original_aspect_ratio=increase,crop=1424:692,format=yuv420p"
wide_poster="crop=in_w-16:in_h-16:8:8,scale=1424:692:flags=lanczos:force_original_aspect_ratio=increase,crop=1424:692"

encode_one() {
  local src="$1"
  local stem="$2"
  local vp9_crf="${3:-32}"
  local h264_crf="${4:-23}"
  local vf="${5:-$scale}"
  local pvf="${6:-$poster_vf}"
  local png="${TMPDIR:-/tmp}/${stem}-poster-$$.png"

  if [[ ! -f "$src" ]]; then
    echo "skip ${stem}: missing $src"
    return 0
  fi

  echo "→ ${stem}: VP9 (crf ${vp9_crf})"
  ffmpeg -y -hide_banner -loglevel error -i "$src" \
    -vf "$vf" \
    -an -c:v libvpx-vp9 -crf "$vp9_crf" -b:v 0 -deadline good -row-mt 1 \
    -tune-content screen -g 60 \
    "${color[@]}" \
    "$out_dir/${stem}.webm"

  echo "→ ${stem}: H.264 (crf ${h264_crf})"
  ffmpeg -y -hide_banner -loglevel error -i "$src" \
    -vf "$vf" \
    -an -c:v libx264 -crf "$h264_crf" -preset slow -tune animation -pix_fmt yuv420p \
    -g 60 -movflags +faststart \
    "${color[@]}" \
    "$out_dir/${stem}.mp4"

  echo "→ ${stem}: poster"
  ffmpeg -y -hide_banner -loglevel error -i "$src" \
    -frames:v 1 -vf "$pvf" \
    "$png"
  POSTER_IN="$png" POSTER_OUT="$out_dir/${stem}-poster.webp" \
    node --input-type=module -e "
      import sharp from 'sharp';
      await sharp(process.env.POSTER_IN)
        .webp({ quality: 82 })
        .toFile(process.env.POSTER_OUT);
    "
  rm -f "$png"
}

mkdir -p "$out_dir"

encode_one "$downloads/1stCard.webm" schedules
encode_one "$downloads/2ndCardNoFlicker.webm" integrations 32 23 \
  "$wide_vf" \
  "$wide_poster"
# Denser motion; slightly higher CRF to stay within the card size budget.
encode_one "$downloads/3rdCard.webm" social-manager 35 26
encode_one "$downloads/4thCard.webm" cloud-control
encode_one "$downloads/5thCard.webm" automations

echo
echo "Encoded sizes:"
ls -lh "$out_dir"/{schedules,integrations,social-manager,cloud-control,automations}.{webm,mp4} \
  "$out_dir"/{schedules,integrations,social-manager,cloud-control,automations}-poster.webp
