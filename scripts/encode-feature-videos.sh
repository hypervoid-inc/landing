#!/usr/bin/env bash
# Re-encode landing feature-card loops from the 4K source WebMs.
# Requires ffmpeg (libvpx-vp9, libx264) and the repo's sharp install.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
out_dir="$root/public/assets/landing/features"
downloads="${FEATURE_VIDEO_SRC_DIR:-$HOME/Downloads}"

# Source renders include a 1px dark matte on the frame edge; cropping it
# before scale stops lanczos from bleeding that line into the 720p output.
scale="crop=in_w-16:in_h-16:8:8,scale=720:720:flags=lanczos,fps=30,format=yuv420p"
poster_vf="crop=in_w-16:in_h-16:8:8,scale=720:720:flags=lanczos"
color=(-colorspace bt709 -color_primaries bt709 -color_trc bt709)

encode_one() {
  local src="$1"
  local stem="$2"
  local vp9_crf="${3:-32}"
  local h264_crf="${4:-23}"
  local png="${TMPDIR:-/tmp}/${stem}-poster-$$.png"

  echo "→ ${stem}: VP9 (crf ${vp9_crf})"
  ffmpeg -y -hide_banner -loglevel error -i "$src" \
    -vf "$scale" \
    -an -c:v libvpx-vp9 -crf "$vp9_crf" -b:v 0 -deadline good -row-mt 1 \
    "${color[@]}" \
    "$out_dir/${stem}.webm"

  echo "→ ${stem}: H.264 (crf ${h264_crf})"
  ffmpeg -y -hide_banner -loglevel error -i "$src" \
    -vf "$scale" \
    -an -c:v libx264 -crf "$h264_crf" -preset slow -pix_fmt yuv420p \
    -movflags +faststart \
    "${color[@]}" \
    "$out_dir/${stem}.mp4"

  echo "→ ${stem}: poster"
  ffmpeg -y -hide_banner -loglevel error -i "$src" \
    -frames:v 1 -vf "$poster_vf" \
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
# Denser motion; slightly higher CRF to stay within the card size budget.
encode_one "$downloads/3rdCard.webm" social-manager 35 26
encode_one "$downloads/4thCard.webm" cloud-control

echo
echo "Encoded sizes:"
ls -lh "$out_dir"/{schedules,social-manager,cloud-control}.{webm,mp4} \
  "$out_dir"/{schedules,social-manager,cloud-control}-poster.webp
