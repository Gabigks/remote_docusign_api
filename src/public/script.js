let contFields = 0; //Contador para garantir nomes únicos para os campos

function addField() {
  console.log("Teste");
  contFields++;
  const divDynamicFields = document.getElementById("dynamicFields");

  //Criação de um novo campo de input
  const newField = document.createElement('input');
  newField.type = 'text';
  newField.name = 'field' + contFields;
  newField.placeholder = 'Campo Dinamico ' + contFields;

  // Adição do novo campo ao div de campos dinâmicos
  divDynamicFields.appendChild(newField);
}