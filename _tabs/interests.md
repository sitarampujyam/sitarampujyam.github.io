---
layout: page
title: Interests
icon: fas fa-heart
order: 5
---

{% assign b = '/assets/img/books/' %}

<div class="books-shelf interests-shelf">

  <article class="book-card interest-card">
    <div class="book-cover" role="img" aria-label="Cover of Gödel, Escher, Bach" style="background-image: url('{{ b | append: 'geb.jpg' | relative_url }}')"></div>
    <div class="book-info">
      <h2 class="book-title" data-toc-skip><a class="card-link" href="{{ '/books/' | relative_url }}">Books</a></h2>
      <p class="book-note">Books are, in my opinion, the most widely misunderstood and underrated medium. Perhaps the blame lies with schools. They are incredible and not at all boring if you know what you are reading and why!</p>
    </div>
  </article>

  <article class="book-card interest-card">
    <div class="book-cover" role="img" aria-label="Interstellar poster" style="background-image: url('{{ b | append: 'interstellar.jpg' | relative_url }}')"></div>
    <div class="book-info">
      <h2 class="book-title" data-toc-skip>Movies</h2>
      <p class="book-note">Movies are a modern form of storytelling. They differ from books in that they cannot truly replicate the depth and feel of a book, but they are stronger in their own way. A good movie is a piece of art and a compelling story together in one.</p>
    </div>
  </article>

  <article class="book-card interest-card">
    <div class="book-cover interest-logo" role="img" aria-label="Veritasium channel logo" style="background-image: url('{{ b | append: 'veritasium.png' | relative_url }}')"></div>
    <div class="book-info">
      <h2 class="book-title" data-toc-skip>Others</h2>
      <p class="book-note">YouTube, articles, blogs, etc.</p>
    </div>
  </article>

</div>
