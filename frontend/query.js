function showReadme() {
  $("button").on(function() {
    $('html,body').animate({
        scrollTop: $(".readme").offset().top},
        'slow');
  });
}