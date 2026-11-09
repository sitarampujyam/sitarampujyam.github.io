---
layout: page
title: Books
icon: fas fa-book-open
order: 5
permalink: /books/
---

{% assign b = '/assets/img/books/' %}

<p class="books-intro">My favourite books.</p>

<div class="books-shelf">

  <article class="book-card">
    <img class="book-cover" src="{{ b | append: 'geb.jpg' | relative_url }}" alt="Cover of Gödel, Escher, Bach" loading="lazy">
    <div class="book-info">
      <h2 class="book-title" data-toc-skip>Gödel, Escher, Bach: An Eternal Golden Braid</h2>
      <p class="book-author">Douglas R. Hofstadter</p>
      <p class="book-note">Probably my all-time favourite.</p>
    </div>
  </article>

  <article class="book-card">
    <img class="book-cover" src="{{ b | append: 'boi.jpg' | relative_url }}" alt="Cover of The Beginning of Infinity" loading="lazy">
    <div class="book-info">
      <h2 class="book-title" data-toc-skip>The Beginning of Infinity: Explanations That Transform the World</h2>
      <p class="book-author">David Deutsch</p>
      <p class="book-note">Even if you don’t read the entire book, just read the first 50 pages. They are, in my opinion, the most optimistic view of science I’ve ever read.</p>
    </div>
  </article>

  <article class="book-card book-series">
    <div class="book-info">
      <h2 class="book-title" data-toc-skip>The Lord of the Rings Trilogy &amp; The Hobbit</h2>
      <p class="book-author">J. R. R. Tolkien</p>
      <p class="book-note">A classic with incredible world-building. My favourite piece of fiction.</p>
    </div>
    <div class="book-strip">
      <img src="{{ b | append: 'hobbit.jpg' | relative_url }}" alt="The Hobbit" title="The Hobbit" loading="lazy">
      <img src="{{ b | append: 'fotr.jpg' | relative_url }}" alt="The Fellowship of the Ring" title="The Fellowship of the Ring" loading="lazy">
      <img src="{{ b | append: 'ttt.jpg' | relative_url }}" alt="The Two Towers" title="The Two Towers" loading="lazy">
      <img src="{{ b | append: 'rotk.jpg' | relative_url }}" alt="The Return of the King" title="The Return of the King" loading="lazy">
    </div>
  </article>

  <article class="book-card book-series">
    <div class="book-info">
      <h2 class="book-title" data-toc-skip>Harry Potter <span class="book-count">· all 7 books</span></h2>
      <p class="book-author">J. K. Rowling</p>
      <p class="book-note">They give me a warmth and nostalgia that no other book does.</p>
    </div>
    <div class="book-strip">
      <img src="{{ b | append: 'hp1.jpg' | relative_url }}" alt="Harry Potter and the Philosopher's Stone" title="Harry Potter and the Philosopher's Stone" loading="lazy">
      <img src="{{ b | append: 'hp2.jpg' | relative_url }}" alt="Harry Potter and the Chamber of Secrets" title="Harry Potter and the Chamber of Secrets" loading="lazy">
      <img src="{{ b | append: 'hp3.jpg' | relative_url }}" alt="Harry Potter and the Prisoner of Azkaban" title="Harry Potter and the Prisoner of Azkaban" loading="lazy">
      <img src="{{ b | append: 'hp4.jpg' | relative_url }}" alt="Harry Potter and the Goblet of Fire" title="Harry Potter and the Goblet of Fire" loading="lazy">
      <img src="{{ b | append: 'hp5.jpg' | relative_url }}" alt="Harry Potter and the Order of the Phoenix" title="Harry Potter and the Order of the Phoenix" loading="lazy">
      <img src="{{ b | append: 'hp6.jpg' | relative_url }}" alt="Harry Potter and the Half-Blood Prince" title="Harry Potter and the Half-Blood Prince" loading="lazy">
      <img src="{{ b | append: 'hp7.jpg' | relative_url }}" alt="Harry Potter and the Deathly Hallows" title="Harry Potter and the Deathly Hallows" loading="lazy">
    </div>
  </article>

  <article class="book-card book-series">
    <div class="book-info">
      <h2 class="book-title" data-toc-skip>The Foundation Series</h2>
      <p class="book-author">Isaac Asimov</p>
      <p class="book-note">Psychohistory is such a cool concept. Amazing hardcore sci-fi.</p>
    </div>
    <div class="book-strip">
      <img src="{{ b | append: 'f1.jpg' | relative_url }}" alt="Foundation" title="Foundation" loading="lazy">
      <img src="{{ b | append: 'f2.jpg' | relative_url }}" alt="Foundation and Empire" title="Foundation and Empire" loading="lazy">
      <img src="{{ b | append: 'f3.jpg' | relative_url }}" alt="Second Foundation" title="Second Foundation" loading="lazy">
    </div>
  </article>

  <article class="book-card">
    <img class="book-cover" src="{{ b | append: 'sapiens.jpg' | relative_url }}" alt="Cover of Sapiens" loading="lazy">
    <div class="book-info">
      <h2 class="book-title" data-toc-skip>Sapiens: A Brief History of Humankind</h2>
      <p class="book-author">Yuval Noah Harari</p>
      <p class="book-note">It really makes you look at the world in a different way.</p>
    </div>
  </article>

  <article class="book-card">
    <img class="book-cover" src="{{ b | append: 'feynman.jpg' | relative_url }}" alt="Cover of Surely You're Joking, Mr. Feynman!" loading="lazy">
    <div class="book-info">
      <h2 class="book-title" data-toc-skip>“Surely You’re Joking, Mr. Feynman!”: Adventures of a Curious Character</h2>
      <p class="book-author">Richard P. Feynman, as told to Ralph Leighton</p>
      <p class="book-note">Super fun and super interesting. Read it all in one sitting!</p>
    </div>
  </article>

  <article class="book-card">
    <img class="book-cover" src="{{ b | append: 'hhgg.jpg' | relative_url }}" alt="Cover of The Hitchhiker's Guide to the Galaxy" loading="lazy">
    <div class="book-info">
      <h2 class="book-title" data-toc-skip>The Hitchhiker’s Guide to the Galaxy</h2>
      <p class="book-author">Douglas Adams</p>
    </div>
  </article>

  <article class="book-card">
    <img class="book-cover" src="{{ b | append: 'tesla.jpg' | relative_url }}" alt="Cover of My Inventions" loading="lazy">
    <div class="book-info">
      <h2 class="book-title" data-toc-skip>My Inventions: The Autobiography of Nikola Tesla</h2>
      <p class="book-author">Nikola Tesla</p>
    </div>
  </article>

  <article class="book-card book-series">
    <div class="book-info">
      <h2 class="book-title" data-toc-skip>Walter Isaacson’s Biographies</h2>
      <p class="book-author">Walter Isaacson</p>
      <p class="book-note"><em>Leonardo da Vinci</em> is such a good one. Isaacson is the most legendary biographer of our times, and I enjoyed all of his works thoroughly.</p>
    </div>
    <div class="book-strip">
      <img src="{{ b | append: 'leo.jpg' | relative_url }}" alt="Leonardo da Vinci" title="Leonardo da Vinci" loading="lazy">
      <img src="{{ b | append: 'einstein.jpg' | relative_url }}" alt="Einstein: His Life and Universe" title="Einstein: His Life and Universe" loading="lazy">
      <img src="{{ b | append: 'jobs.jpg' | relative_url }}" alt="Steve Jobs" title="Steve Jobs" loading="lazy">
      <img src="{{ b | append: 'musk.jpg' | relative_url }}" alt="Elon Musk" title="Elon Musk" loading="lazy">
      <img src="{{ b | append: 'innovators.jpg' | relative_url }}" alt="The Innovators" title="The Innovators" loading="lazy">
    </div>
  </article>

</div>
