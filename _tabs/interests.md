---
layout: page
title: Interests
icon: fas fa-heart
order: 5
---

{% assign b = '/assets/img/books/' %}

<div class="books-shelf interests-shelf">

  <a class="book-card interest-card" href="{{ '/books/' | relative_url }}">
    <img class="book-cover" src="{{ b | append: 'geb.jpg' | relative_url }}" alt="Cover of Gödel, Escher, Bach" loading="lazy">
    <div class="book-info">
      <h2 class="book-title" data-toc-skip>Books</h2>
      <p class="book-note">Books are, in my opinion, the most widely misunderstood and underrated medium. Perhaps the blame lies with schools. They are incredible and not at all boring if you know what you are reading and why!</p>
    </div>
  </a>

  <article class="book-card interest-card">
    <img class="book-cover" src="{{ b | append: 'interstellar.jpg' | relative_url }}" alt="Interstellar poster" loading="lazy">
    <div class="book-info">
      <h2 class="book-title" data-toc-skip>Movies</h2>
      <p class="book-note">Movies are a modern form of storytelling. They differ from books in that they cannot truly replicate the depth and feel of a book, but they are stronger in their own way. A good movie is a piece of art and a compelling story together in one.</p>
    </div>
  </article>

  <article class="book-card interest-card">
    <img class="book-cover interest-logo" src="{{ b | append: 'veritasium.png' | relative_url }}" alt="Veritasium channel logo" loading="lazy">
    <div class="book-info">
      <h2 class="book-title" data-toc-skip>Others</h2>
      <p class="book-note">YouTube, articles, blogs, etc.</p>
    </div>
  </article>

</div>
