(function () {
  const DIFFICULTY = { easy: 38, medium: 30, hard: 22 }; // cells to reveal
  const STORAGE_KEY = "sudoku-best";
  let solution = [];
  let puzzle = [];
  let selected = null;
  let timerInterval = null;
  let elapsedSeconds = 0;
  let solved = false;
  let paused = false;

  const boardEl = document.getElementById("board");
  const boardWrapEl = document.getElementById("board-wrap");
  const footerEl = document.querySelector("footer");
  const messageEl = document.getElementById("message");
  const timerEl = document.getElementById("timer");
  const bestEl = document.getElementById("best");
  const difficultyEl = document.getElementById("difficulty");
  const newGameBtn = document.getElementById("new-game");
  const pauseBtn = document.getElementById("pause-btn");
  const checkBtn = document.getElementById("check");
  const numberStripEl = document.getElementById("number-strip");

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function getBestKey(diff) {
    return STORAGE_KEY + "-" + diff;
  }

  function getBest(diff) {
    const raw = localStorage.getItem(getBestKey(diff));
    return raw === null ? null : parseInt(raw, 10);
  }

  function setBest(diff, seconds) {
    localStorage.setItem(getBestKey(diff), String(seconds));
  }

  function updateBestDisplay() {
    const diff = difficultyEl.value;
    const best = getBest(diff);
    bestEl.textContent = "Best: " + (best === null ? "—" : formatTime(best));
  }

  function startTimer() {
    stopTimer();
    elapsedSeconds = 0;
    solved = false;
    timerEl.textContent = formatTime(0);
    timerInterval = setInterval(() => {
      elapsedSeconds++;
      timerEl.textContent = formatTime(elapsedSeconds);
    }, 1000);
  }

  function resumeTimer() {
    stopTimer();
    timerEl.textContent = formatTime(elapsedSeconds);
    timerInterval = setInterval(() => {
      elapsedSeconds++;
      timerEl.textContent = formatTime(elapsedSeconds);
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function setPaused(value) {
    paused = value;
    pauseBtn.textContent = paused ? "Resume" : "Pause";
    pauseBtn.setAttribute("aria-pressed", paused ? "true" : "false");
    if (paused) {
      stopTimer();
      if (document.activeElement && boardEl.contains(document.activeElement)) {
        document.activeElement.blur();
      }
      selected = null;
      clearSelectionClasses();
      clearHoverHighlights();
      resetNumberStripState();
      boardWrapEl.classList.add("paused");
    } else {
      boardWrapEl.classList.remove("paused");
      if (!solved) resumeTimer();
    }
  }

  function showMessage(text, type = "") {
    messageEl.textContent = text;
    messageEl.className = "message " + type;
  }

  function clearMessage() {
    messageEl.textContent = "";
    messageEl.className = "message";
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function isValid(grid, r, c, num) {
    for (let i = 0; i < 9; i++) {
      if (grid[r][i] === num || grid[i][c] === num) return false;
    }
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        if (grid[br + i][bc + j] === num) return false;
    return true;
  }

  function solve(grid) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] !== 0) continue;
        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (const n of nums) {
          if (!isValid(grid, r, c, n)) continue;
          grid[r][c] = n;
          if (solve(grid)) return true;
          grid[r][c] = 0;
        }
        return false;
      }
    }
    return true;
  }

  function createSolved() {
    const grid = Array(9).fill(null).map(() => Array(9).fill(0));
    solve(grid);
    return grid.map(row => [...row]);
  }

  function createPuzzle(diff) {
    solution = createSolved();
    const keep = DIFFICULTY[diff] || DIFFICULTY.easy;
    const indices = shuffle(Array.from({ length: 81 }, (_, i) => i)).slice(0, keep);
    puzzle = Array(9).fill(null).map(() => Array(9).fill(0));
    indices.forEach(idx => {
      const r = Math.floor(idx / 9), c = idx % 9;
      puzzle[r][c] = solution[r][c];
    });
  }

  function clearSelectionClasses() {
    boardEl.querySelectorAll(".cell-focus").forEach((cell) => cell.classList.remove("cell-focus"));
  }

  function setSelectedCell(r, c) {
    const cell = getCell(r, c);
    if (!cell || !cell.classList.contains("user")) {
      selected = null;
      clearSelectionClasses();
      return;
    }
    selected = { r, c };
    clearSelectionClasses();
    cell.classList.add("cell-focus");
  }

  function clearHoverHighlights() {
    boardEl.querySelectorAll(".row-hover, .col-hover").forEach((cell) => {
      cell.classList.remove("row-hover", "col-hover");
    });
  }

  function applyHoverHighlights(r, c) {
    clearHoverHighlights();
    boardEl.querySelectorAll(".cell").forEach((cell) => {
      if (+cell.dataset.r === r) cell.classList.add("row-hover");
      if (+cell.dataset.c === c) cell.classList.add("col-hover");
    });
  }

  function resetNumberStripState() {
    if (!numberStripEl) return;
    numberStripEl.querySelectorAll(".num-btn").forEach((btn) => {
      btn.disabled = false;
    });
  }

  function isAllowedInRowOrColumn(r, c, n) {
    for (let i = 0; i < 9; i++) {
      if (i !== c && puzzle[r][i] === n) return false;
      if (i !== r && puzzle[i][c] === n) return false;
    }
    return true;
  }

  function updateNumberStripForCell(r, c) {
    if (!numberStripEl) return;
    const cell = getCell(r, c);
    const shouldHint = difficultyEl.value === "easy" &&
      !!cell &&
      cell.classList.contains("user") &&
      puzzle[r][c] === 0;

    if (!shouldHint) {
      resetNumberStripState();
      return;
    }

    numberStripEl.querySelectorAll(".num-btn").forEach((btn) => {
      const n = Number.parseInt(btn.dataset.n, 10);
      btn.disabled = !isAllowedInRowOrColumn(r, c, n);
    });
  }

  function setCellValue(r, c, value) {
    const cell = getCell(r, c);
    if (!cell || !cell.classList.contains("user")) return;
    puzzle[r][c] = value;
    cell.textContent = value === 0 ? "" : String(value);
    cell.classList.remove("wrong");
    clearMessage();
    if (selected && selected.r === r && selected.c === c) {
      updateNumberStripForCell(r, c);
    }
  }

  function render() {
    boardEl.innerHTML = "";
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.r = r;
        cell.dataset.c = c;
        cell.setAttribute("role", "gridcell");
        cell.setAttribute("tabindex", "0");
        cell.addEventListener("focus", () => {
          setSelectedCell(r, c);
          scrollFocusedCellIntoView();
          updateNumberStripForCell(r, c);
        });
        cell.addEventListener("click", () => cell.focus());
        cell.addEventListener("mouseenter", () => {
          applyHoverHighlights(r, c);
          updateNumberStripForCell(r, c);
        });
        cell.addEventListener("mouseleave", () => {
          clearHoverHighlights();
          if (selected) updateNumberStripForCell(selected.r, selected.c);
          else resetNumberStripState();
        });
        if (puzzle[r][c] !== 0) {
          cell.classList.add("given");
          cell.textContent = puzzle[r][c];
          cell.addEventListener("keydown", onKeyNavigateOnly);
        } else {
          cell.classList.add("user");
          cell.textContent = puzzle[r][c] === 0 ? "" : String(puzzle[r][c]);
          cell.addEventListener("keydown", onKey);
        }
        boardEl.appendChild(cell);
      }
    }
    clearHoverHighlights();
    clearSelectionClasses();
    selected = null;
    resetNumberStripState();
  }

  function getCell(r, c) {
    return boardEl.querySelector(`[data-r="${r}"][data-c="${c}"]`);
  }

  function scrollFocusedCellIntoView() {
    function doScroll() {
      if (!boardWrapEl) return;
      if (window.visualViewport) {
        const rect = boardWrapEl.getBoundingClientRect();
        const vv = window.visualViewport;
        const padding = 24;
        let scrollBy = 0;
        if (rect.bottom > vv.height - padding) {
          scrollBy = Math.max(scrollBy, rect.bottom - (vv.height - padding));
        }
        if (footerEl) {
          const footerRect = footerEl.getBoundingClientRect();
          if (footerRect.top < vv.height) {
            scrollBy = Math.max(scrollBy, footerRect.top - vv.height);
          }
        }
        if (scrollBy > 0) {
          window.scrollBy({ top: scrollBy, left: 0, behavior: "smooth" });
        }
      } else {
        boardWrapEl.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      }
    }
    setTimeout(doScroll, 350);
  }

  function onKey(e) {
    const r = +e.target.dataset.r, c = +e.target.dataset.c;
    if (e.key >= "1" && e.key <= "9") {
      setCellValue(r, c, parseInt(e.key, 10));
      e.preventDefault();
      return;
    }
    if (e.key === "Backspace" || e.key === "Delete") {
      setCellValue(r, c, 0);
      e.preventDefault();
      return;
    }
    const dir = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
    if (dir) {
      e.preventDefault();
      moveFocus(r, c, dir);
    }
  }

  function onKeyNavigateOnly(e) {
    const dir = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
    if (dir) {
      e.preventDefault();
      const r = +e.target.dataset.r, c = +e.target.dataset.c;
      moveFocus(r, c, dir);
    }
  }

  function moveFocus(r, c, dir) {
    const nr = Math.max(0, Math.min(8, r + dir[0]));
    const nc = Math.max(0, Math.min(8, c + dir[1]));
    const next = getCell(nr, nc);
    if (next) next.focus();
  }

  function check() {
    let hasWrong = false;
    boardEl.querySelectorAll(".cell.user").forEach(cell => {
      const r = +cell.dataset.r, c = +cell.dataset.c;
      const val = puzzle[r][c];
      cell.classList.remove("wrong");
      if (val !== 0 && val !== solution[r][c]) {
        cell.classList.add("wrong");
        hasWrong = true;
      }
    });
    if (hasWrong) showMessage("Some cells are incorrect.", "error");
    else if (puzzle.flat().every((v, i) => v === solution.flat()[i])) {
      stopTimer();
      if (!solved) {
        solved = true;
        const diff = difficultyEl.value;
        const best = getBest(diff);
        const isNewBest = best === null || elapsedSeconds < best;
        if (isNewBest) setBest(diff, elapsedSeconds);
        updateBestDisplay();
        const msg = isNewBest
          ? "Solved in " + formatTime(elapsedSeconds) + " — New best!"
          : "Solved in " + formatTime(elapsedSeconds) + ". Well done!";
        showMessage(msg, "success");
      }
    } else showMessage("So far so good. Keep going!", "success");
  }

  function newGame() {
    setPaused(false);
    createPuzzle(difficultyEl.value);
    render();
    clearMessage();
    startTimer();
    updateBestDisplay();
  }

  newGameBtn.addEventListener("click", newGame);
  pauseBtn.addEventListener("click", () => setPaused(!paused));
  checkBtn.addEventListener("click", check);
  difficultyEl.addEventListener("change", newGame);
  if (numberStripEl) {
    numberStripEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".num-btn");
      if (!btn || btn.disabled || !selected || paused) return;
      const n = Number.parseInt(btn.dataset.n, 10);
      setCellValue(selected.r, selected.c, n);
    });
  }

  newGame();
})();
