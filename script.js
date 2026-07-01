$(document).ready(function () {

    const flagCodeMapping = {
        "South Africa": "za", "Canada": "ca", "Germany": "de", "Paraguay": "py",
        "Netherlands": "nl", "Morocco": "ma", "Brazil": "br", "Japan": "jp",
        "France": "fr", "Sweden": "se", "Ivory Coast": "ci", "Norway": "no",
        "Mexico": "mx", "Ecuador": "ec", "England": "gb-eng", "DR Congo": "cd",
        "USA": "us", "Bosnia & Herzegovina": "ba", "Belgium": "be", "Senegal": "sn",
        "Portugal": "pt", "Croatia": "hr", "Spain": "es", "Austria": "at",
        "Switzerland": "ch", "Algeria": "dz", "Argentina": "ar", "Cape Verde": "cv",
        "Colombia": "co", "Ghana": "gh", "Australia": "au", "Egypt": "eg",
        "South Korea": "kr", "Wales": "gb-wls", "Saudi Arabia": "sa", "Poland": "pl"
    };

    const center = 400; // 800px / 2
    const radii = [350, 290, 230, 170, 110];

    const svg = $('#lines-svg')[0];
    const nodesContainer = $('#nodes-container');

    function normalizeAngle(a) {
        while (a < 0) a += 360;
        return a % 360;
    }

    function drawOrthogonalPath(r_start, a_start_deg, r_end, a_end_deg, isActive, isFinal = false) {
        let a_start = a_start_deg * (Math.PI / 180);
        let a_end = a_end_deg * (Math.PI / 180);

        let p1x = center + r_start * Math.cos(a_start);
        let p1y = center + r_start * Math.sin(a_start);

        let p2x = center + r_end * Math.cos(a_start);
        let p2y = center + r_end * Math.sin(a_start);

        let p3x = center + r_end * Math.cos(a_end);
        let p3y = center + r_end * Math.sin(a_end);

        let diff = a_end_deg - a_start_deg;
        while (diff <= -180) diff += 360;
        while (diff > 180) diff -= 360;

        let sweep = (diff > 0) ? 1 : 0;

        let pathClass = "bracket-line";
        if (isActive) pathClass += " active-line";
        if (isFinal && isActive) pathClass += " final-line";

        let path = `<path d="M ${p1x} ${p1y} L ${p2x} ${p2y}`;

        if (Math.abs(diff) > 0.1 && r_end > 0) {
            path += ` A ${r_end} ${r_end} 0 0 ${sweep} ${p3x} ${p3y}`;
        }

        path += `" class="${pathClass}" />`;
        return path;
    }


    function getBracketSequence(matchNum, matchesDict) {
        let m = matchesDict[matchNum];
        if (!m) return [];

        if (m.round === "Round of 32") {
            return [m.team1, m.team2];
        }

        function findParentMatch(teamName) {
            for (let num in matchesDict) {
                let match = matchesDict[num];
                if (match.round === "Round of 32" && (match.team1 === teamName || match.team2 === teamName)) {
                    return match.num;
                }
            }
            return null;
        }

        let sequence = [];
        if (m.team1 && m.team1.startsWith("W")) {
            let parentNum = parseInt(m.team1.substring(1));
            sequence = sequence.concat(getBracketSequence(parentNum, matchesDict));
        } else {
            let parentNum = findParentMatch(m.team1);
            if (parentNum) {
                sequence = sequence.concat(getBracketSequence(parentNum, matchesDict));
            } else {
                sequence.push(m.team1);
            }
        }

        if (m.team2 && m.team2.startsWith("W")) {
            let parentNum = parseInt(m.team2.substring(1));
            sequence = sequence.concat(getBracketSequence(parentNum, matchesDict));
        } else {
            let parentNum = findParentMatch(m.team2);
            if (parentNum) {
                sequence = sequence.concat(getBracketSequence(parentNum, matchesDict));
            } else {
                sequence.push(m.team2);
            }
        }

        return sequence;
    }

    function buildBracket(matchesDict) {

        let startingTeams = getBracketSequence(104, matchesDict);

        if (startingTeams.length !== 32) {
            console.error("Could not parse full 32-team sequence from API dependencies.");
            return;
        }

        let svgContent = '';
        let rounds = [];

        let round0 = [];
        for (let i = 0; i < 32; i++) {
            let angle = (i * 360 / 32);
            let team = startingTeams[i];
            round0.push({ team: team, angle: angle });

            let rad = angle * (Math.PI / 180);
            let x = center + radii[0] * Math.cos(rad);
            let y = center + radii[0] * Math.sin(rad);

            let code = flagCodeMapping[team] || "un";
            let flagUrl = `https://flagcdn.com/w80/${code}.png`;

            let node = $('<div>').addClass('node node-flag').css({
                left: `${(x / 800) * 100}%`,
                top: `${(y / 800) * 100}%`
            });

            let content = $('<div>').addClass('node-content');
            let img = $('<img>').attr('src', flagUrl).attr('alt', team).attr('title', team);

            content.append(img);
            node.append(content);
            nodesContainer.append(node);
        }
        rounds.push(round0);

        function getWinner(t1, t2) {
            for (let num in matchesDict) {
                let m = matchesDict[num];
                if ((m.team1 === t1 && m.team2 === t2) || (m.team1 === t2 && m.team2 === t1) ||
                    (m.team1 === t1 && m.team2.startsWith("W")) ||
                    (m.team1.startsWith("W") && m.team2 === t2)) {

                    if (m.score && m.score.ft) {
                        if (m.score.p) return m.score.p[0] > m.score.p[1] ? m.team1 : m.team2;
                        if (m.score.et) return m.score.et[0] > m.score.et[1] ? m.team1 : m.team2;
                        if (m.score.ft[0] > m.score.ft[1]) return m.team1;
                        if (m.score.ft[0] < m.score.ft[1]) return m.team2;
                    }
                }
            }
            return null;
        }

        let currentTeams = 32;
        for (let r = 1; r <= 4; r++) {
            currentTeams /= 2;
            let currentRound = [];

            for (let i = 0; i < currentTeams; i++) {
                let p1 = rounds[r - 1][i * 2];
                let p2 = rounds[r - 1][i * 2 + 1];

                let winner = null;
                if (p1.team && p2.team) {
                    winner = getWinner(p1.team, p2.team);
                }

                let angle1 = p1.angle;
                let angle2 = p2.angle;
                if (Math.abs(angle1 - angle2) > 180) {
                    if (angle1 < angle2) angle1 += 360;
                    else angle2 += 360;
                }

                let angle = normalizeAngle((angle1 + angle2) / 2);
                currentRound.push({ team: winner, angle: angle });

                let isActive1 = (winner && p1.team === winner);
                let isActive2 = (winner && p2.team === winner);

                svgContent += drawOrthogonalPath(radii[r - 1], p1.angle, radii[r], angle, isActive1);
                svgContent += drawOrthogonalPath(radii[r - 1], p2.angle, radii[r], angle, isActive2);

                let rad = angle * (Math.PI / 180);
                let x = center + radii[r] * Math.cos(rad);
                let y = center + radii[r] * Math.sin(rad);

                if (winner) {
                    let code = flagCodeMapping[winner] || "un";
                    let flagUrl = `https://flagcdn.com/w40/${code}.png`;
                    let node = $('<div>').addClass('node node-flag inner-flag').css({
                        left: `${(x / 800) * 100}%`, top: `${(y / 800) * 100}%`
                    });

                    let content = $('<div>').addClass('node-content');
                    let img = $('<img>').attr('src', flagUrl).attr('alt', winner).attr('title', winner);
                    content.append(img);
                    node.append(content);
                    nodesContainer.append(node);
                } else {
                    let node = $('<div>').addClass('node node-dot').css({ left: `${(x / 800) * 100}%`, top: `${(y / 800) * 100}%` });
                    nodesContainer.append(node);
                }
            }
            rounds.push(currentRound);
        }

        let f1 = rounds[4][0];
        let f2 = rounds[4][1];
        let finalWinner = null;
        if (f1.team && f2.team) {
            finalWinner = getWinner(f1.team, f2.team);
        }

        svgContent += drawOrthogonalPath(radii[4], f1.angle, 0, f1.angle, (finalWinner && f1.team === finalWinner), true);
        svgContent += drawOrthogonalPath(radii[4], f2.angle, 0, f2.angle, (finalWinner && f2.team === finalWinner), true);

        $(svg).html(svgContent);
    }

    fetch('https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json')
        .then(response => response.json())
        .then(data => {
            let matchesDict = {};
            data.matches.forEach(m => {
                if (m.num) {
                    matchesDict[m.num] = m;
                }
            });
            buildBracket(matchesDict);
        })
        .catch(err => {
            console.error("Failed to fetch API dynamically", err);
        });
});
