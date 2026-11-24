const element = id => document.getElementById(id);
const colors = {Normal:'#29977c', Standby:'#d69a27', Barriers:'#c45353'};
let history = [];
let rows = [];
let selected = 'Clonmel';
let map;
const markers = new Map();

function node(tag, text, className) {
    const result = document.createElement(tag);
    result.textContent = text;
    if (className) result.className = className;
    return result;
}

function showTown(name) {
    selected = name;
    const town = history.find(row => row.town === name);
    const live = rows.find(row => row.town === name);
    const detail = element('town-detail');
    detail.replaceChildren(node('h3', name), node('p', `${town.river} · ${town.county}`));
    const badge = element('selected-level');
    badge.textContent = live ? `${live.level}${live.rehearsal ? ' · Rehearsal' : ''}` : 'Awaiting live data';
    badge.className = `badge ${live?.level || ''}`;
    const metrics = node('div', '', 'detail-metrics');
    for (const [label, value] of [['Peak flow', live?.peak], ['95th percentile', town.p95], ['99th percentile', town.p99]]) {
        const item = node('div', '');
        item.append(node('span', label), node('strong', Number.isFinite(value) ? value.toFixed(2) : '—'), node('span', 'm³/s'));
        metrics.append(item);
    }
    detail.append(metrics);
    if (live) {
        detail.append(node('p', live.crew ? `${live.crew} crew · barriers before 18:00` : live.escalate ? 'Escalate to Area Manager. Apply every Standby measure.' : live.level === 'Standby' ? 'Confirm staff, check pumps and stage sandbags.' : 'Routine monitoring.'));
        detail.append(node('p', `${live.pumps} pumps · ${live.sandbags} sandbags · ${live.staff_on_call} staff on call`));
        detail.append(node('p', live.notes));
    } else {
        detail.append(node('p', 'Refresh the plan for the current forecast and team resources.'));
    }
    detail.append(node('p', 'History 2016–2025 · Model-cell identity remains provisional.'));
    for (const button of element('town-list').children) button.setAttribute('aria-pressed', String(button.textContent === name));
}

export function initialiseDashboard(data) {
    history = data;
    for (const town of data) {
        const button = node('button', town.town);
        button.onclick = () => {
            showTown(town.town);
            const marker = markers.get(town.town);
            if (marker) {map.panTo(marker.getLatLng()); marker.openTooltip();}
        };
        element('town-list').append(button);
    }
    if (window.L) {
        element('map').replaceChildren();
        map = L.map('map', {scrollWheelZoom:false});
        const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom:18, attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        tiles.on('tileerror', () => {element('updated').textContent = 'Map tiles unavailable. Use the town list to inspect data.';});
        for (const town of data) {
            const coordinates = town.opw_station.geometry.coordinates;
            const marker = L.circleMarker([coordinates[1],coordinates[0]], {
                radius:9, color:'#fff', weight:3, fillColor:'#71858b', fillOpacity:1
            }).addTo(map);
            marker.bindTooltip(node('span', town.town), {direction:'top'});
            marker.on('click', () => showTown(town.town));
            markers.set(town.town, marker);
        }
        const fit = () => map.fitBounds(L.featureGroup([...markers.values()]).getBounds().pad(.22));
        element('fit-map').onclick = fit;
        fit();
    } else {
        element('map').replaceChildren(node('p','Map service unavailable. Select a town from the list.','map-fallback'));
        element('fit-map').disabled = true;
    }
    showTown(selected);
    element('settings-open').onclick = () => {
        element('settings').open = true;
        element('connections').scrollIntoView({behavior:'smooth',block:'center'});
        element('sheet').focus({preventScroll:true});
    };
    element('refresh').onclick = () => {
        element('question').value = "What is tonight's plan?";
        element('ask').click();
    };
    for (const button of document.querySelectorAll('[data-question]')) {
        button.onclick = () => {
            element('question').value = button.dataset.question;
            element('assistant').scrollIntoView({behavior:'smooth',block:'start'});
            element('ask').click();
        };
    }
}

export function resetDashboard() {
    rows = [];
    for (const level of ['normal','standby','barriers']) element(`count-${level}`).textContent = '—';
    for (const marker of markers.values()) marker.setStyle({fillColor:'#71858b'});
    element('crew-list').replaceChildren(node('p','Awaiting a complete live-data result.'));
    element('updated').textContent = 'Awaiting current data';
    showTown(selected);
}

export function setBusy(busy) {
    element('refresh').disabled = busy;
    for (const button of document.querySelectorAll('[data-question]')) button.disabled = busy;
    element('ask').textContent = busy ? 'Reading sources…' : 'Ask River Watch ↗';
}

export function renderDashboard(result, retrieved) {
    rows = result;
    for (const level of ['Normal','Standby','Barriers']) {
        element(`count-${level.toLowerCase()}`).textContent = result.filter(row => row.level === level).length;
    }
    for (const row of result) markers.get(row.town)?.setStyle({fillColor:colors[row.level]});
    element('updated').textContent = `${result.some(row => row.rehearsal) ? 'Rehearsal · ' : ''}Retrieved ${new Date(retrieved).toLocaleString('en-IE',{timeZone:'Europe/Dublin'})} · Dublin time`;
    const crews = element('crew-list');
    crews.replaceChildren();
    for (const name of ['Clonmel','Mallow','Athlone']) {
        const article = node('article','');
        const towns = result.filter(row => row.crew === name).map(row => row.town);
        article.append(node('h3',`${name} crew`), node('p',towns.length ? towns.join(', ') : 'No barrier assignment'));
        crews.append(article);
    }
    showTown(selected);
}


