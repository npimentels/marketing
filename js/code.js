// Customização do light box
lightbox.option({
    albumLabel:'Foto %1 de %2',
    fadeDuration: 1000
});


// Inicialização do AOS animation
AOS.init(); 


// Comportamento da seta sobe
// Quando ocorre rolagem na tela do navegador
$(window).scroll(function(){
    // Se a rolagem for maior ou igual a 550, mostra a seta com fade 
    // caso contrário não mostrará a seta com fade
    if($(window).scrollTop() >= 550)
    {
        $('.seta-sobe').fadeIn();
    }
    else{
        $('.seta-sobe').fadeOut();
    }
});


$('.seta-sobe').click(function(){
// Aplica animação de rolagem no body, html até o topo
    $('body, html').animate({
        scrollTop : 0
    },1200);
});


// Aplica rolagem nos links quando clicar nela
$('.rolagem').click(function(){
    // Posição vertical do item clicado
    var id = $(this).attr('href');
    var destino= $(id).offset().top;
    $('html, body').animate({
        scrollTop: destino,
    })
});


// Códigos para o formulário

// O texto txt-idade é o valor do campo de idade
$('#txt-idade').text($('#idade').val());

// Evento atualização do campo idade 
$('#idade').change(function(){
    $('#txt-idade').text($('#idade').val());

});


// Validação da parte de cadastro
(function() {
    'use strict';
    window.addEventListener('load', function() {
      // Pega todos os formulários que nós queremos aplicar estilos de validação Bootstrap personalizados.
      var forms = document.getElementsByClassName('needs-validation');
      // Faz um loop neles e evita o envio
      var validation = Array.prototype.filter.call(forms, function(form) {
        form.addEventListener('submit', function(event) {
          if (form.checkValidity() === false) {
            event.preventDefault();
            event.stopPropagation();
          }
          form.classList.add('was-validated');
        }, false);
      });
    }, false);
  })();

// Preenche a lista de estados com a API do IBGE quando a página é carregada
$.ajax({
    url: 'https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome',
    success: function(dados){
        var tag = '';
        // Laço de repetição executa repetidamente até o final
        for (let i = 0; i < dados.length; i++) {
            tag += '<option value="'+dados[i].id+'">' + dados[i].nome + '</option>';
            
        }
        // preenche a lista estados com a variavel tag
        $('#estados').html(tag);
    },
    error: function(msg){
        alert ('Não foi possivel carregar. Tente mais tarde.')
    }
});
// atualiza cidades quando um estado é selecionado
$('#estados').change(function(){
    $('.listacidades').css('display', 'block');
    var uf = $('#estados').val();
    $.ajax({
        url : 'https://servicodados.ibge.gov.br/api/v1/localidades/estados/'+ uf +'/municipios',
        success: function(dados){
            var tags = '';
            for (i = 0; i < dados.length; i++) {
                tags += '<option value="'+dados[i].id+'">' + dados[i].nome + '</option>';
            }
            $('#cidades').html(tags);
        },
        error: function(msg){
            alert('Não foi possível carregar a lista de estados. Tente novamente mais tarde.');
          }
    });
  });



