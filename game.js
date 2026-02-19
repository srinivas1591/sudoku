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
  const messageEl = document.getElementById("message");
  const timerEl = document.getElementById("timer");
  const bestEl = document.getElementById("best");
  const difficultyEl = document.getElementById("difficulty");
  const newGameBtn = document.getElementById("new-game");
  const pauseBtn = document.getElementById("pause-btn");
  const checkBtn = document.getElementById("check");
  const popupOverlayEl = document.getElementById("number-popup-overlay");
  const numberPopupEl = document.getElementById("number-popup");
  const inputMethodToggleEl = document.getElementById("input-method-toggle");

  const INPUT_METHOD_KEY = "sudoku-input-method";
  let popupTarget = null;

  function isMobile() {
    return ("ontouchstart" in window || navigator.maxTouchPoints > 0) &&
      window.matchMedia("(max-width: 600px)").matches;
  }

  function setMobileClass() {
    document.body.classList.toggle("mobile", isMobile());
  }

  function showNumberPopup() {
    if (popupOverlayEl && selected) {
      popupTarget = { r: selected.r, c: selected.c };
      popupOverlayEl.classList.add("show");
      popupOverlayEl.setAttribute("aria-hidden", "false");
    }
  }

  function closeNumberPopup() {
    if (popupOverlayEl) {
      popupOverlayEl.classList.remove("show");
      popupOverlayEl.setAttribute("aria-hidden", "true");
    }
    popupTarget = null;
    selected = null;
    updateMobileSelectionUI();
  }

  function usePopupInput() {
    return localStorage.getItem(INPUT_METHOD_KEY) !== "keyboard";
  }

  function setInputMethod(popup) {
    localStorage.setItem(INPUT_METHOD_KEY, popup ? "popup" : "keyboard");
    closeNumberPopup();
    if (inputMethodToggleEl) {
      inputMethodToggleEl.textContent = popup ? "Popup" : "Keyboard";
      inputMethodToggleEl.title = popup ? "Using number popup. Click to switch to keyboard." : "Using keyboard. Click to switch to popup.";
    }
    render();
  }

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
      closeNumberPopup();
      updateMobileSelectionUI();
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

  function updateMobileSelectionUI() {
    boardEl.querySelectorAll(".cell").forEach((el) => el.classList.remove("selected"));
    if (selected) {
      const cell = getCell(selected.r, selected.c);
      if (cell && cell.classList.contains("user")) {
        cell.classList.add("selected");
        if (isMobile() && usePopupInput()) showNumberPopup();
      } else if (isMobile()) {
        closeNumberPopup();
      }
    } else if (isMobile()) {
      closeNumberPopup();
    }
  }

  function render() {
    boardEl.innerHTML = "";
    const mobile = isMobile();
    const usePopup = usePopupInput();
    const usePopupOnMobile = mobile && usePopup;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.r = r;
        cell.dataset.c = c;
        cell.setAttribute("role", "gridcell");
        cell.setAttribute("tabindex", "0");
        cell.addEventListener("focus", () => { selected = { r, c }; if (mobile) updateMobileSelectionUI(); });
        cell.addEventListener("blur", () => { selected = null; if (mobile) updateMobileSelectionUI(); });
        cell.addEventListener("click", (e) => {
          if (usePopupOnMobile && cell.classList.contains("user")) {
            e.preventDefault();
            selected = { r, c };
            updateMobileSelectionUI();
          } else {
            cell.focus();
          }
        });
        if (puzzle[r][c] !== 0) {
          cell.classList.add("given");
          cell.textContent = puzzle[r][c];
          cell.addEventListener("keydown", onKeyNavigateOnly);
        } else {
          cell.classList.add("user");
          cell.textContent = puzzle[r][c] ? String(puzzle[r][c]) : "";
          if (!usePopupOnMobile) {
            cell.contentEditable = "true";
            cell.setAttribute("inputmode", "numeric");
            cell.addEventListener("keydown", onKey);
            cell.addEventListener("input", onInput);
          }
        }
        boardEl.appendChild(cell);
      }
    }
    if (mobile) updateMobileSelectionUI();
  }

  function getCell(r, c) {
    return boardEl.querySelector(`[data-r="${r}"][data-c="${c}"]`);
  }

  function onInput(e) {
    const el = e.target;
    const v = el.textContent.replace(/\D/g, "").slice(-1);
    el.textContent = v;
    placeCaretAtEnd(el);
    const r = +el.dataset.r, c = +el.dataset.c;
    puzzle[r][c] = v ? parseInt(v, 10) : 0;
    el.classList.remove("wrong");
    clearMessage();
  }

  function placeCaretAtEnd(el) {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function onKey(e) {
    const el = e.target;
    const r = +el.dataset.r, c = +el.dataset.c;
    if (e.key >= "1" && e.key <= "9") return;
    if (e.key === "Backspace" || e.key === "Delete") {
      el.textContent = "";
      puzzle[r][c] = 0;
      el.classList.remove("wrong");
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

  function onPopupNumberClick(e) {
    const btn = e.target.closest(".numpad-btn");
    if (!btn || paused) return;
    e.stopPropagation();
    e.preventDefault();
    const target = popupTarget;
    if (!target) return;
    const cell = getCell(target.r, target.c);
    if (!cell || !cell.classList.contains("user")) return;
    const n = parseInt(btn.dataset.n, 10);
    puzzle[target.r][target.c] = n;
    cell.textContent = n ? String(n) : "";
    cell.classList.remove("wrong");
    clearMessage();
    closeNumberPopup();
  }

  newGameBtn.addEventListener("click", newGame);
  pauseBtn.addEventListener("click", () => setPaused(!paused));
  checkBtn.addEventListener("click", check);
  difficultyEl.addEventListener("change", newGame);

  if (inputMethodToggleEl) {
    inputMethodToggleEl.textContent = usePopupInput() ? "Popup" : "Keyboard";
    inputMethodToggleEl.title = usePopupInput() ? "Using number popup. Click to switch to keyboard." : "Using keyboard. Click to switch to popup.";
    inputMethodToggleEl.addEventListener("click", () => setInputMethod(!usePopupInput()));
  }

  if (popupOverlayEl) {
    popupOverlayEl.addEventListener("click", (e) => {
      if (e.target === popupOverlayEl) closeNumberPopup();
    });
  }
  if (numberPopupEl) {
    numberPopupEl.addEventListener("click", onPopupNumberClick);
  }

  window.addEventListener("resize", setMobileClass);
  setMobileClass();
  newGame();
})();
