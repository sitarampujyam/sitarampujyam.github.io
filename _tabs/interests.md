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
    <div class="book-info">
      <h2 class="book-title" data-toc-skip>Academics</h2>
    </div>
  </article>

</div>
