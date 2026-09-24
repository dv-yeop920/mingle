#!/usr/bin/env python3
"""Generate and verify immutable Gothic A1 critical subsets for the home shell."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import tempfile
from pathlib import Path

import brotli
import fontTools
from fontTools.subset import Options, Subsetter, load_font, save_font
from fontTools.ttLib import TTFont


ROOT = Path(__file__).resolve().parents[1]
FONT_DIR = ROOT / "scripts" / "fonts"
SOURCES_PATH = FONT_DIR / "home-critical-sources.txt"
CODEPOINTS_PATH = FONT_DIR / "home-critical-codepoints.txt"
MANIFEST_PATH = FONT_DIR / "home-critical-fonts.json"
IMMUTABLE_VERSION = "v3"
OUTPUT_DIR = ROOT / "public" / "fonts" / IMMUTABLE_VERSION
ASCII_CODEPOINTS = frozenset(range(0x20, 0x7F))
WEIGHTS = ("400", "700", "800", "900")
DYNAMIC_FALLBACK_PROBE = ord("힣")
FIXED_CRITICAL_PROBE = ord("안")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--write",
        action="store_true",
        help="write canonical inventory, subset assets, and output checksums",
    )
    return parser.parse_args()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_manifest() -> dict:
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def read_sources() -> list[Path]:
    entries = [
        line.strip()
        for line in SOURCES_PATH.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    ]
    if entries != sorted(set(entries)):
        raise RuntimeError(f"{SOURCES_PATH} must be sorted and contain no duplicates")

    sources = [ROOT / entry for entry in entries]
    missing = [str(path.relative_to(ROOT)) for path in sources if not path.is_file()]
    if missing:
        raise RuntimeError(f"missing inventory sources: {', '.join(missing)}")
    return sources


def collect_inventory(sources: list[Path], input_cmaps: list[set[int]]) -> tuple[list[int], list[int]]:
    visible_codepoints = set(ASCII_CODEPOINTS)
    for source in sources:
        visible_codepoints.update(
            ord(character)
            for character in source.read_text(encoding="utf-8")
            if ord(character) >= 0x80
        )

    common_cmap = set.intersection(*input_cmaps)
    supported = sorted(visible_codepoints & common_cmap)
    platform_fallback = sorted(visible_codepoints - common_cmap)
    if not supported:
        raise RuntimeError("critical inventory is empty")
    return supported, platform_fallback


def format_codepoints(codepoints: list[int]) -> str:
    return "".join(f"{codepoint:04X}\n" for codepoint in codepoints)


def format_unicode_range(codepoints: list[int]) -> str:
    ranges: list[tuple[int, int]] = []
    start = previous = codepoints[0]
    for codepoint in codepoints[1:]:
        if codepoint == previous + 1:
            previous = codepoint
            continue
        ranges.append((start, previous))
        start = previous = codepoint
    ranges.append((start, previous))
    return ", ".join(
        f"U+{start:X}" if start == end else f"U+{start:X}-{end:X}"
        for start, end in ranges
    )


def read_cmap(path: Path) -> set[int]:
    with TTFont(path, lazy=True) as font:
        return set(font.getBestCmap())


def build_subset(input_path: Path, output_path: Path, codepoints: list[int]) -> None:
    options = Options()
    options.flavor = "woff2"
    options.canonical_order = True
    options.recalc_timestamp = False
    options.glyph_names = False
    options.hinting = True
    options.retain_gids = False

    font = load_font(str(input_path), options, dontLoadGlyphNames=True)
    subsetter = Subsetter(options=options)
    subsetter.populate(unicodes=codepoints)
    subsetter.subset(font)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    save_font(font, str(output_path), options)
    font.close()


def verify_subset(path: Path, expected: set[int], input_cmap: set[int]) -> None:
    actual = read_cmap(path)
    missing = expected - actual
    unexpected_cjk = {
        codepoint
        for codepoint in actual - expected
        if (0x3400 <= codepoint <= 0x4DBF or 0x4E00 <= codepoint <= 0x9FFF or 0xAC00 <= codepoint <= 0xD7A3)
        and codepoint in input_cmap
    }
    if missing:
        raise RuntimeError(f"{path} is missing requested codepoints: {sorted(missing)}")
    if unexpected_cjk:
        raise RuntimeError(f"{path} contains unrequested CJK codepoints: {sorted(unexpected_cjk)}")
    if actual != expected:
        raise RuntimeError(f"{path} cmap does not exactly match the critical inventory")


def generate_to(directory: Path, manifest: dict, codepoints: list[int]) -> dict[str, dict[str, int | str]]:
    outputs: dict[str, dict[str, int | str]] = {}
    expected = set(codepoints)
    for weight in WEIGHTS:
        input_path = ROOT / manifest["inputs"][weight]["path"]
        output_path = directory / f"gothic-a1-critical-{weight}.woff2"
        input_cmap = read_cmap(input_path)
        build_subset(input_path, output_path, codepoints)
        verify_subset(output_path, expected, input_cmap)
        outputs[weight] = {
            "path": str(output_path.relative_to(ROOT)) if output_path.is_relative_to(ROOT) else output_path.name,
            "bytes": output_path.stat().st_size,
            "sha256": sha256(output_path),
        }
    return outputs


def verify_inputs_and_tools(manifest: dict) -> list[set[int]]:
    expected_fonttools = manifest["tooling"]["fonttools"]
    expected_brotli = manifest["tooling"]["brotli"]
    if fontTools.__version__ != expected_fonttools or brotli.__version__ != expected_brotli:
        raise RuntimeError(
            "tool version mismatch: "
            f"fonttools={fontTools.__version__} (expected {expected_fonttools}), "
            f"brotli={brotli.__version__} (expected {expected_brotli})"
        )

    cmaps: list[set[int]] = []
    for weight in WEIGHTS:
        entry = manifest["inputs"][weight]
        input_path = ROOT / entry["path"]
        actual_hash = sha256(input_path)
        if actual_hash != entry["sha256"]:
            raise RuntimeError(f"canonical input changed without a version bump: {input_path}")
        cmaps.append(read_cmap(input_path))
    return cmaps


def verify_manifest_inventory(
    manifest: dict,
    canonical_inventory: str,
    codepoints: list[int],
    platform_fallback: list[int],
    unicode_range: str,
) -> None:
    inventory = manifest["inventory"]
    expected_fallback = [f"U+{value:04X}" for value in platform_fallback]
    expected_hash = hashlib.sha256(canonical_inventory.encode()).hexdigest()
    expected_values = {
        "source_allowlist": str(SOURCES_PATH.relative_to(ROOT)),
        "codepoints": str(CODEPOINTS_PATH.relative_to(ROOT)),
        "count": len(codepoints),
        "sha256": expected_hash,
        "unicode_range": unicode_range,
        "platform_fallback_codepoints": expected_fallback,
    }
    if inventory != expected_values:
        raise RuntimeError("manifest inventory is stale; run with --write")


def build_full_cmap_manifest(
    input_cmaps: list[set[int]], critical_cmap: set[int]
) -> dict:
    entries = {}
    for weight, cmap in zip(WEIGHTS, input_cmaps):
        canonical_cmap = format_codepoints(sorted(cmap))
        residual_cmap = cmap - critical_cmap
        canonical_residual = format_codepoints(sorted(residual_cmap))
        entries[weight] = {
            "canonical": {
                "count": len(cmap),
                "sha256": hashlib.sha256(canonical_cmap.encode()).hexdigest(),
                "unicode_range": format_unicode_range(sorted(cmap)),
            },
            "residual": {
                "count": len(residual_cmap),
                "sha256": hashlib.sha256(canonical_residual.encode()).hexdigest(),
                "unicode_range": format_unicode_range(sorted(residual_cmap)),
            },
        }
    return {
        "is_common_across_weights": all(cmap == input_cmaps[0] for cmap in input_cmaps[1:]),
        "weights": entries,
    }


def verify_full_cmaps(
    manifest: dict,
    input_cmaps: list[set[int]],
    critical_cmap: set[int],
    platform_fallback: list[int],
) -> None:
    expected = build_full_cmap_manifest(input_cmaps, critical_cmap)
    if manifest["full_cmaps"] != expected:
        raise RuntimeError("canonical v1 cmap manifest is stale; run with --write")

    union_cmap = set.union(*input_cmaps)
    incorrectly_supported = sorted(set(platform_fallback) & union_cmap)
    if incorrectly_supported:
        formatted = ", ".join(f"U+{value:04X}" for value in incorrectly_supported)
        raise RuntimeError(
            f"platform-fallback codepoints unexpectedly exist in a v1 cmap: {formatted}"
        )

    for weight, canonical_cmap in zip(WEIGHTS, input_cmaps):
        residual_cmap = canonical_cmap - critical_cmap
        critical_in_weight = critical_cmap & canonical_cmap
        if residual_cmap & critical_cmap:
            raise RuntimeError(f"v1 residual range overlaps critical cmap for weight {weight}")
        if residual_cmap | critical_in_weight != canonical_cmap:
            raise RuntimeError(f"v1 residual and critical cmaps do not reconstruct weight {weight}")
        if DYNAMIC_FALLBACK_PROBE not in residual_cmap:
            raise RuntimeError(f"dynamic Hangul fallback probe is missing for weight {weight}")
        if FIXED_CRITICAL_PROBE not in critical_in_weight or FIXED_CRITICAL_PROBE in residual_cmap:
            raise RuntimeError(f"fixed critical probe leaked into v1 residual weight {weight}")


def normalize_css_range(value: str) -> str:
    return ", ".join(part.strip() for part in value.split(","))


def write_css_contract(manifest: dict, critical_range: str) -> None:
    css_path = ROOT / "src/shared/styles/fonts.css"
    css = css_path.read_text(encoding="utf-8")
    updated_critical_weights: set[str] = set()
    updated_full_weights: set[str] = set()

    def replace_critical_face(match: re.Match[str]) -> str:
        block = match.group(0)
        if not re.search(r"font-family:\s*['\"]Gothic A1 Critical['\"];", block):
            return block
        weight_match = re.search(r"font-weight:\s*(400|700|800|900);", block)
        if not weight_match:
            return block
        weight = weight_match.group(1)
        updated, range_count = re.subn(
            r"unicode-range:\s*[^;]+;",
            f"unicode-range: {critical_range};",
            block,
        )
        updated, source_count = re.subn(
            r"/fonts/v\d+/gothic-a1-critical-(400|700|800|900)\.woff2",
            f"/fonts/{IMMUTABLE_VERSION}/gothic-a1-critical-{weight}.woff2",
            updated,
        )
        if range_count != 1 or source_count != 1:
            raise RuntimeError(f"could not update critical face contract for weight {weight}")
        updated_critical_weights.add(weight)
        return updated

    def replace_full_face(match: re.Match[str]) -> str:
        block = match.group(0)
        if not re.search(r"font-family:\s*['\"]Gothic A1['\"];", block):
            return block
        weight_match = re.search(r"font-weight:\s*(400|700|800|900);", block)
        if not weight_match:
            return block
        weight = weight_match.group(1)
        residual_range = manifest["full_cmaps"]["weights"][weight]["residual"][
            "unicode_range"
        ]
        updated, count = re.subn(
            r"unicode-range:\s*[^;]+;",
            f"unicode-range: {residual_range};",
            block,
        )
        if count != 1:
            raise RuntimeError(f"could not update full face unicode-range for weight {weight}")
        updated_full_weights.add(weight)
        return updated

    updated_css = re.sub(
        r"@font-face\s*\{[^}]+\}", replace_critical_face, css, flags=re.DOTALL
    )
    updated_css = re.sub(
        r"@font-face\s*\{[^}]+\}", replace_full_face, updated_css, flags=re.DOTALL
    )
    if updated_critical_weights != set(WEIGHTS):
        raise RuntimeError(
            f"did not update all critical face contracts: {sorted(updated_critical_weights)}"
        )
    if updated_full_weights != set(WEIGHTS):
        raise RuntimeError(
            f"did not update all full face ranges: {sorted(updated_full_weights)}"
        )
    css_path.write_text(updated_css, encoding="utf-8")


def verify_integration(manifest: dict, unicode_range: str) -> None:
    css = (ROOT / "src/shared/styles/fonts.css").read_text(encoding="utf-8")
    layout = (ROOT / "src/app/layout.tsx").read_text(encoding="utf-8")
    next_config = (ROOT / "next.config.ts").read_text(encoding="utf-8")

    critical_family_faces = re.findall(
        r"font-family:\s*['\"]Gothic A1 Critical['\"];", css
    )
    if len(critical_family_faces) != len(WEIGHTS):
        raise RuntimeError("fonts.css must declare exactly four critical faces")
    critical_blocks = [
        block
        for block in re.findall(r"@font-face\s*\{([^}]+)\}", css, re.DOTALL)
        if re.search(r"font-family:\s*['\"]Gothic A1 Critical['\"];", block)
    ]
    critical_ranges = [
        normalize_css_range(re.search(r"unicode-range:\s*([^;]+);", block).group(1))
        for block in critical_blocks
    ]
    if critical_ranges != [unicode_range] * len(WEIGHTS):
        raise RuntimeError("critical faces must share the generated unicode-range")
    critical_displays = [
        re.search(r"font-display:\s*([^;]+);", block).group(1).strip()
        for block in critical_blocks
    ]
    if critical_displays != [manifest["display"]["critical"]] * len(WEIGHTS):
        raise RuntimeError("critical faces must preserve font-display: optional")

    full_blocks = [
        block
        for block in re.findall(r"@font-face\s*\{([^}]+)\}", css, re.DOTALL)
        if re.search(r"font-family:\s*['\"]Gothic A1['\"];", block)
    ]
    if len(full_blocks) != len(WEIGHTS):
        raise RuntimeError("fonts.css must declare exactly four full Gothic A1 faces")
    for weight in WEIGHTS:
        matching_blocks = [
            block
            for block in full_blocks
            if re.search(rf"font-weight:\s*{weight};", block)
        ]
        if len(matching_blocks) != 1:
            raise RuntimeError(f"fonts.css must declare one full face for weight {weight}")
        match = re.search(r"unicode-range:\s*([^;]+);", matching_blocks[0])
        if not match:
            raise RuntimeError(f"full face {weight} is missing its canonical unicode-range")
        actual_range = normalize_css_range(match.group(1))
        expected_range = manifest["full_cmaps"]["weights"][weight]["residual"][
            "unicode_range"
        ]
        if actual_range != expected_range:
            raise RuntimeError(
                f"full face {weight} unicode-range does not match its residual v1 cmap"
            )
        display_match = re.search(r"font-display:\s*([^;]+);", matching_blocks[0])
        actual_display = display_match.group(1).strip() if display_match else None
        if actual_display != manifest["display"]["residual"]:
            raise RuntimeError(
                f"residual full face {weight} must use font-display: swap"
            )

    if manifest["display"] != {"critical": "optional", "residual": "swap"}:
        raise RuntimeError("unexpected F1 font-display contract")

    for weight in WEIGHTS:
        url = f"/fonts/{IMMUTABLE_VERSION}/gothic-a1-critical-{weight}.woff2"
        if len(re.findall(rf"url\(['\"]{re.escape(url)}['\"]\)", css)) != 1:
            raise RuntimeError(f"fonts.css must reference {url} exactly once")

    preload_urls = re.findall(
        r'<link\s+rel="preload"\s+href="([^"]+)"\s+as="font"', layout
    )
    expected_preloads = [
        f"/fonts/{IMMUTABLE_VERSION}/gothic-a1-critical-{weight}.woff2"
        for weight in manifest["preload_weights"]
    ]
    if preload_urls != expected_preloads:
        raise RuntimeError(f"unexpected font preloads: {preload_urls}")
    if manifest["preload_weights"] != ["700", "800", "900"]:
        raise RuntimeError("F1 must preload critical weights 700, 800, and 900")
    if f"source: '/fonts/{IMMUTABLE_VERSION}/:path*'" not in next_config:
        raise RuntimeError(
            f"next.config.ts is missing the immutable {IMMUTABLE_VERSION} font cache rule"
        )

    for weight in WEIGHTS:
        output = manifest["outputs"][weight]
        expected_path = (
            f"public/fonts/{IMMUTABLE_VERSION}/gothic-a1-critical-{weight}.woff2"
        )
        if output["path"] != expected_path:
            raise RuntimeError(f"unexpected output path for weight {weight}")
        output_path = ROOT / output["path"]
        if output_path.stat().st_size != output["bytes"]:
            raise RuntimeError(f"committed size mismatch for weight {weight}")


def main() -> None:
    args = parse_args()
    manifest = read_manifest()
    if manifest["version"] != IMMUTABLE_VERSION:
        raise RuntimeError(
            f"manifest version must be {IMMUTABLE_VERSION}, got {manifest['version']}"
        )
    input_cmaps = verify_inputs_and_tools(manifest)
    sources = read_sources()
    codepoints, platform_fallback = collect_inventory(sources, input_cmaps)
    canonical_inventory = format_codepoints(codepoints)
    unicode_range = format_unicode_range(codepoints)

    if args.write:
        with tempfile.TemporaryDirectory(prefix="mingle-critical-fonts-") as first_dir, tempfile.TemporaryDirectory(
            prefix="mingle-critical-fonts-repeat-"
        ) as second_dir:
            first = generate_to(Path(first_dir), manifest, codepoints)
            second = generate_to(Path(second_dir), manifest, codepoints)
            for weight in WEIGHTS:
                if first[weight]["sha256"] != second[weight]["sha256"]:
                    raise RuntimeError(f"non-deterministic subset output for weight {weight}")
                source = Path(first_dir) / f"gothic-a1-critical-{weight}.woff2"
                destination = OUTPUT_DIR / source.name
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(source, destination)
                first[weight]["path"] = str(destination.relative_to(ROOT))

        CODEPOINTS_PATH.write_text(canonical_inventory, encoding="utf-8")
        manifest["outputs"] = first
        manifest["inventory"] = {
            "source_allowlist": str(SOURCES_PATH.relative_to(ROOT)),
            "codepoints": str(CODEPOINTS_PATH.relative_to(ROOT)),
            "count": len(codepoints),
            "sha256": hashlib.sha256(canonical_inventory.encode()).hexdigest(),
            "unicode_range": unicode_range,
            "platform_fallback_codepoints": [f"U+{value:04X}" for value in platform_fallback],
        }
        manifest["full_cmaps"] = build_full_cmap_manifest(input_cmaps, set(codepoints))
        write_css_contract(manifest, unicode_range)
        MANIFEST_PATH.write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    else:
        if CODEPOINTS_PATH.read_text(encoding="utf-8") != canonical_inventory:
            raise RuntimeError("critical codepoint inventory is stale; run with --write")
        verify_manifest_inventory(
            manifest,
            canonical_inventory,
            codepoints,
            platform_fallback,
            unicode_range,
        )
        verify_full_cmaps(manifest, input_cmaps, set(codepoints), platform_fallback)
        with tempfile.TemporaryDirectory(prefix="mingle-critical-fonts-check-") as temp_dir:
            generated = generate_to(Path(temp_dir), manifest, codepoints)
            for weight in WEIGHTS:
                output_path = ROOT / manifest["outputs"][weight]["path"]
                if not output_path.is_file():
                    raise RuntimeError(f"missing generated output: {output_path}")
                if generated[weight]["sha256"] != manifest["outputs"][weight]["sha256"]:
                    raise RuntimeError(f"generated checksum mismatch for weight {weight}")
                if sha256(output_path) != manifest["outputs"][weight]["sha256"]:
                    raise RuntimeError(f"committed checksum mismatch for weight {weight}")
                verify_subset(output_path, set(codepoints), input_cmaps[WEIGHTS.index(weight)])

    manifest = read_manifest()
    verify_full_cmaps(manifest, input_cmaps, set(codepoints), platform_fallback)
    verify_integration(manifest, unicode_range)

    print(f"verified {len(codepoints)} critical codepoints ({unicode_range})")
    for weight in WEIGHTS:
        entry = manifest["outputs"].get(weight, {})
        if entry:
            print(f"{weight}: {entry['bytes']} bytes {entry['sha256']}")


if __name__ == "__main__":
    main()
