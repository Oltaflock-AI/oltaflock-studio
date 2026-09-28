#!/usr/bin/env python3
"""Regenerates supabase/functions/_shared/catalog/models-higgsfield.ts from the
Higgsfield API docs (https://docs.higgsfield.ai/docs/llms.txt).

Every model workflow page carries its endpoint id and complete JSON input
schema; this turns each one into a catalog ModelSpec so the Studio renders
its controls and upload slots like any other model.

    python3 scripts/gen-higgsfield-catalog.py
"""

import json
import re
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

DOCS = 'https://docs.higgsfield.ai'
OUT = Path(__file__).resolve().parent.parent / 'supabase/functions/_shared/catalog/models-higgsfield.ts'

# Inputs the Studio has no editor for yet (asset ids, per-shot lists, RGB objects).
SKIP_PROPS = {'elements', 'multi_prompt', 'multi_shots', 'colors', 'background_color', 'file_url'}

ADVANCED = {
    'seed', 'cfg_scale', 'negative_prompt', 'prompt_optimizer', 'prompt_extend', 'prompt_extend_mode',
    'enable_thinking', 'moderation', 'aigc_watermark', 'bitrate_mode', 'fps', 'image_weight',
    'style_id', 'style_strength', 'preset_id', 'custom_reference_id', 'custom_reference_strength',
    'link_url', 'output_format', 'rendering_speed', 'keep_original_sound',
}

IMAGE_URL_KEYS = {'image_url', 'first_frame_url', 'last_frame_url', 'end_image_url', 'last_image_url', 'image_reference_url'}

LABELS = {
    'aspect_ratio': 'Aspect ratio', 'cfg_scale': 'CFG scale', 'negative_prompt': 'Negative prompt',
    'generate_audio': 'Audio', 'sound': 'Audio', 'fps': 'FPS', 'aigc_watermark': 'AI watermark',
    'batch_size': 'Images', 'enhance_prompt': 'Enhance prompt', 'image_url': 'Image',
    'image_urls': 'Reference images', 'video_url': 'Video', 'video_urls': 'Reference videos',
    'audio_url': 'Audio', 'audio_urls': 'Reference audio', 'first_frame_url': 'Start frame',
    'last_frame_url': 'End frame', 'end_image_url': 'End frame', 'last_image_url': 'End frame',
    'image_reference_url': 'Image reference', 'link_url': 'Reference web page',
}

# Endpoint prefix → (maker shown in the picker, Prompt Brain family key)
MAKERS = [
    ('bytedance/seedance-2.5', 'ByteDance', 'seedance-2.5'),
    ('bytedance/', 'ByteDance', 'seedance'),
    ('kling-video/', 'Kuaishou', 'kling'),
    ('alibaba/happy-horse', 'Alibaba', 'happyhorse'),
    ('alibaba/qwen-image', 'Alibaba', 'qwen'),
    ('alibaba/wan', 'Alibaba', 'wan'),
    ('wan/', 'Alibaba', 'wan'),
    ('minimax/hailuo', 'MiniMax', 'hailuo'),
    ('minimax/', 'MiniMax', 'minimax'),
    ('xai/', 'xAI', 'grok'),
    ('pixverse/', 'PixVerse', 'pixverse'),
    ('ideogram/', 'Ideogram', 'ideogram'),
    ('recraft/', 'Recraft', 'recraft'),
    ('z-image/', 'Alibaba', 'z-image'),
    ('lightricks/', 'Lightricks', 'ltx'),
    ('higgsfield-ai/soul', 'Higgsfield', 'soul'),
    ('higgsfield/cinema-studio', 'Higgsfield', 'cinema-studio'),
    ('higgsfield/genjutsu', 'Higgsfield', 'genjutsu'),
    ('marketing-studio/', 'Higgsfield', 'marketing-studio'),
]


def get(url: str) -> str:
    req = urllib.request.Request(url, headers={'User-Agent': 'oltaflock-catalog-gen'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode()


def humanize(key: str) -> str:
    return LABELS.get(key) or key.replace('_', ' ').capitalize()


def option_label(v) -> str:
    if isinstance(v, bool):
        return 'On' if v else 'Off'
    s = str(v)
    return s if re.match(r'^[\d:.]+[a-z]*$', s) else s.replace('-', ' ').replace('_', ' ').capitalize()


FAMILY_BLURBS: dict[str, str] = {}


def workflow_links() -> list[str]:
    families = set()
    for cat in ('video-generation', 'image-generation'):
        for m in re.findall(r'/docs/models/([a-z0-9.-]+)', get(f'{DOCS}/docs/models/{cat}.md')):
            m = re.sub(r'\.md$', '', m)
            if m not in ('video-generation', 'image-generation'):
                families.add(m)

    def links(fam: str) -> list[str]:
        page = get(f'{DOCS}/docs/models/{fam}.md')
        blurb = re.search(r'^> (?!##|Fetch|Use this)(.+)$', page, re.M)
        if blurb:
            FAMILY_BLURBS[fam] = blurb.group(1).strip()
        return re.findall(rf'/docs/models/{re.escape(fam)}/[a-z0-9_-]+', page)

    with ThreadPoolExecutor(12) as ex:
        found = {link for group in ex.map(links, sorted(families)) for link in group}
    return sorted(found)


def parse(page: str) -> dict | None:
    ep = re.search(r'\*\*Endpoint ID:\*\* `([^`]+)`', page)
    sch = re.search(r'Complete JSON schema">\s*```json[^\n]*\n(.*?)```', page, re.S)
    if not ep or not sch:
        return None
    title = re.search(r'^# (.+)$', page, re.M).group(1).replace(' API', '').strip()
    family, _, variant = title.partition(' — ')
    out = re.search(r'A completed response includes.*?```json[^\n]*\n(.*?)```', page, re.S)
    output = 'video'
    if out and '"images"' in out.group(1):
        output = 'image'
    notes = re.findall(r'^\* (.+)$', page.split('## Quick start')[0], re.M)
    fam_slug = re.search(r'\[← [^\]]+\]\(/docs/models/([a-z0-9.-]+)\)', page)
    return dict(endpoint=ep.group(1), family=family.strip(), variant=variant.strip(), output=output,
                schema=json.loads(sch.group(1)), notes=notes, fam_slug=fam_slug.group(1) if fam_slug else '')


def media_kind(key: str) -> str:
    if key.startswith('video'):
        return 'video'
    if key.startswith('audio'):
        return 'audio'
    return 'image'


def build(wf: dict) -> list[dict]:
    schema = wf['schema']
    props: dict = schema.get('properties', {})
    required = set(schema.get('required', []))
    # Single-shot rules live in if/then/else (Kling O3); the Studio sends single shots.
    required |= set(schema.get('else', {}).get('required', []))
    fields, media = [], []
    fixed = {'multi_shots': False} if 'multi_shots' in props else {}

    for key, p in props.items():
        if key == 'prompt' or key in SKIP_PROPS:
            continue
        # anyOf [T, null] → T
        if 'anyOf' in p:
            inner = next((x for x in p['anyOf'] if x.get('type') != 'null'), {})
            p = {**inner, **{k: v for k, v in p.items() if k != 'anyOf'}}
        typ = p.get('type')
        help_text = (p.get('description') or '').strip()[:160] or None

        is_url = key.endswith('_url') and key not in ('link_url',)
        if is_url or key.endswith('_urls'):
            kind = 'image' if key in IMAGE_URL_KEYS else media_kind(key)
            slot = dict(key=key, api=key, kind=kind, label=p.get('title') or humanize(key),
                        max=1 if is_url else int(p.get('maxItems') or 4))
            if is_url:
                slot['single'] = True
            lo = int(p.get('minItems') or 0) or (1 if key in required else 0)
            if lo:
                slot['min'] = lo
            if help_text:
                slot['help'] = help_text
            media.append(slot)
            continue

        f: dict = dict(key=key, label=humanize(key) if key in LABELS else (p.get('title') or humanize(key)))
        if 'enum' in p:
            f['type'] = 'enum'
            f['options'] = [{'value': v, 'label': option_label(v)} for v in p['enum']]
        elif typ == 'boolean':
            f['type'] = 'boolean'
        elif key == 'seed':
            f['type'] = 'seed'
        elif typ in ('integer', 'number'):
            f['type'] = 'number'
            if 'minimum' in p:
                f['min'] = p['minimum']
            if 'maximum' in p:
                f['max'] = p['maximum']
            f['step'] = p.get('multipleOf') or (1 if typ == 'integer' else 0.1)
        elif typ == 'string':
            f['type'] = 'textarea' if key == 'negative_prompt' else 'text'
        else:
            continue
        # Opaque ids (style / preset uuids) are left to the API default.
        if 'default' in p and p['default'] is not None and f['type'] != 'text':
            f['default'] = p['default']
        if key in ADVANCED:
            f['advanced'] = True
        if help_text and f['type'] != 'textarea':
            f['help'] = help_text
        fields.append(f)

    prompt = props.get('prompt')
    base = dict(
        endpoint=wf['endpoint'], output=wf['output'], fields=fields, media=media, fixed=fixed,
        promptRequired='prompt' in required, noPrompt=prompt is None,
        promptMax=(prompt or {}).get('maxLength'), blurb=FAMILY_BLURBS.get(wf['fam_slug'], ''),
    )

    ep = wf['endpoint'].lower()
    requires_video = any(m['kind'] == 'video' and m.get('min') for m in media)
    requires_image = any(m['kind'] == 'image' and m.get('min') for m in media)
    has_image = any(m['kind'] == 'image' for m in media)

    if wf['output'] == 'image':
        if requires_image or 'edit' in ep:
            return [dict(base, mode='image-to-image')]
        if has_image:
            # Optional image input: offer it as generation and as an edit (image required).
            edit_media = [dict(m, min=1) if m['kind'] == 'image' else m for m in media]
            return [dict(base, mode='text-to-image'), dict(base, mode='image-to-image', media=edit_media, suffix='edit')]
        return [dict(base, mode='text-to-image')]

    if requires_video or any(w in ep for w in ('video-edit', 'video-extend', 'video-reference', 'motion-control', 'genjutsu')):
        return [dict(base, mode='video-to-video')]
    if requires_image or any(w in ep for w in ('image-to-video', 'first-last-frame', 'reference-to-video', 'image-reference')):
        return [dict(base, mode='image-to-video')]
    return [dict(base, mode='text-to-video')]


def ts(v) -> str:
    return json.dumps(v, ensure_ascii=False)


def main() -> None:
    links = workflow_links()
    print(f'{len(links)} workflow pages', file=sys.stderr)
    with ThreadPoolExecutor(12) as ex:
        pages = list(ex.map(lambda l: get(f'{DOCS}{l}.md'), links))

    specs = []
    for page in pages:
        wf = parse(page)
        if not wf:
            continue
        maker, brain_family = next(((m, f) for p, m, f in MAKERS if wf['endpoint'].startswith(p)), ('Higgsfield', 'higgsfield'))
        for s in build(wf):
            variant = wf['variant'] or ''
            name = f"{wf['family']} · {variant}" if variant else wf['family']
            if s.get('suffix') == 'edit':
                name = f"{wf['family']} · Edit"
            s.update(maker=maker, brainFamily=brain_family, name=name)
            s['id'] = 'hf:' + wf['endpoint'] + (':edit' if s.get('suffix') == 'edit' else '')
            specs.append(s)

    lines = [
        '// GENERATED by scripts/gen-higgsfield-catalog.py from docs.higgsfield.ai — do not edit by hand.',
        '// Higgsfield API models. Prices come from the live /estimate endpoint, not a table.',
        '',
        "import type { ModelSpec } from './types.ts';",
        '',
        'export const HIGGSFIELD_SPECS: ModelSpec[] = [',
    ]
    for s in specs:
        spec = {
            'id': s['id'], 'family': s['brainFamily'], 'name': s['name'], 'provider': s['maker'],
            'mode': s['mode'], 'bestFor': (s['blurb'] or s['name'])[:140],
            'api': 'higgsfield', 'backend': 'higgsfield', 'endpoint': s['endpoint'], 'output': s['output'],
        }
        if not s['promptRequired'] and not s['noPrompt']:
            spec['promptRequired'] = False
        if s['noPrompt']:
            spec['noPrompt'] = True
        if s['promptMax']:
            spec['promptMax'] = s['promptMax']
        spec['fields'] = s['fields']
        spec['media'] = s['media']
        spec['pricing'] = {'credits': 0}
        if s['fixed']:
            spec['fixed'] = s['fixed']
        if any(f['key'] in ('generate_audio', 'sound') for f in s['fields']):
            spec['audio'] = True
        lines.append(f'  {ts(spec)},')
    lines.append('];')
    OUT.write_text('\n'.join(lines) + '\n')
    print(f'wrote {len(specs)} specs → {OUT}', file=sys.stderr)


if __name__ == '__main__':
    main()
