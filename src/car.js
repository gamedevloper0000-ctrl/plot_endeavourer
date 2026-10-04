export function renderCar(id) { return `<svg viewBox="0 0 600 250" role="img" aria-label="Red valley roadster with cream racing stripes and polished wheels">
  <defs><linearGradient id="${id}-paint" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ff9472"/><stop offset=".43" stop-color="#e64a3e"/><stop offset="1" stop-color="#9c2f32"/></linearGradient><linearGradient id="${id}-glass" x1="0" x2="1"><stop stop-color="#77a7ac"/><stop offset=".45" stop-color="#315661"/><stop offset="1" stop-color="#163b46"/></linearGradient></defs>
  <ellipse cx="305" cy="213" rx="242" ry="18" fill="#071f23" opacity=".42"/>
  <path d="M60 167 89 137 164 121 206 66Q222 49 265 49H356Q383 52 409 88L445 129 510 143Q532 148 539 174L531 193H59L53 183Z" fill="url(#${id}-paint)" stroke="#562d30" stroke-width="7" stroke-linejoin="round"/>
  <path d="M216 69H352Q374 70 393 96L417 128H181Z" fill="url(#${id}-glass)" stroke="#582e30" stroke-width="6"/>
  <path d="M302 65 298 128" stroke="#f7dcb2" stroke-width="8"/>
  <path d="M221 76H256L199 117H187Z" fill="#d4e4da" opacity=".44"/>
  <path d="M176 132H436M85 147 154 134M442 137 508 151" fill="none" stroke="#ffba8f" stroke-width="5"/>
  <path d="M256 139H284L268 182H242ZM292 139H303L288 182H277Z" fill="#f5deaf" opacity=".94"/>
  <path d="M65 178H531" stroke="#753034" stroke-width="12"/>
  <path d="M190 160H230M329 160H393" stroke="#ba3540" stroke-width="5"/>
  <path d="M95 142 124 138 111 155 77 162Z" fill="#fff1bf" stroke="#d09d70" stroke-width="3"/>
  <path d="M511 149 529 157 533 174 507 169Z" fill="#f4b858"/>
  <rect x="337" y="139" width="21" height="5" rx="2" fill="#edd7b8"/>
  <path d="M55 190H109M457 190H535" stroke="#dedbc8" stroke-width="7"/>
  <g fill="#1e3037" stroke="#392b30" stroke-width="5"><circle cx="162" cy="189" r="37"/><circle cx="440" cy="189" r="37"/></g>
  <g fill="#e6ddd0" stroke="#789091" stroke-width="5"><circle cx="162" cy="189" r="22"/><circle cx="440" cy="189" r="22"/></g>
  <g stroke="#526b74" stroke-width="5"><path d="M162 169V209M142 189H182M440 169V209M420 189H460"/></g>
  <g fill="#f9e6be"><circle cx="162" cy="189" r="7"/><circle cx="440" cy="189" r="7"/></g>
</svg>`; }
