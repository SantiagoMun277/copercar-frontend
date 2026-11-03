// Catálogos locales de DEMOSTRACIÓN basados en ejemplos de los mockups.
// El backend será la fuente definitiva de marcas, líneas, ciudades y estados.
export const vehicleStatuses=['Disponible','Ingresando','No disponible','Vendido','Separado']
export const brands=['Mazda','BMW','Chevrolet','Dodge','Fiat','Ford','Great Wall','Honda','Hyundai','Jeep','Jetour','Kia','Audi','Mercedes Benz','Mitsubishi','Nissan','Peugeot','Renault','Ssangyong','Suzuki','Toyota','Volkswagen','Volvo','Yamaha']
export const linesByBrand={
 Mazda:['CX-30 Grand Touring LX','Mazda 2 Touring','Mazda 3 Grand Touring','Mazda 3 Sport','Mazda 6 Grand Touring','CX-5 Signature','CX-50 Turbo','CX-9 Grand Touring','BT-50 Professional','MX-5 Miata'],
 Chevrolet:['Onix RS','Tracker','Tahoe'],Volvo:['C40','XC40'],Toyota:['Corolla Cross','Corolla','Prado'],Renault:['Sandero','Duster'],BMW:['X5'],Ford:['Ranger'],Honda:['Civic'],Nissan:['Sentra'],Volkswagen:['Jetta']
}
export const departments=['AMAZONAS','ANTIOQUIA','ARAUCA','ATLÁNTICO','BOGOTÁ D.C.','BOLÍVAR','BOYACÁ','CALDAS','CAQUETÁ','CASANARE','CAUCA','CESAR','CHOCÓ','CÓRDOBA','CUNDINAMARCA','GUAINÍA','GUAVIARE','HUILA','LA GUAJIRA','MAGDALENA','META','NARIÑO','NORTE DE SANTANDER','PUTUMAYO','QUINDÍO','RISARALDA','SAN ANDRÉS Y PROVIDENCIA','SANTANDER','SUCRE','TOLIMA','VALLE DEL CAUCA','VAUPÉS','VICHADA']
export const citiesByDepartment={
 'VALLE DEL CAUCA':['Cali','Palmira','Tuluá','Guadalajara de Buga','Cartago','Jamundí','Yumbo','Buenaventura','Candelaria','La Unión','Zarzal'],
 'CAQUETÁ':['Albania','Belén de los Andaquíes','Cartagena del Chairá','Curillo','El Doncello','El Paujil','Florencia','La Montañita','Milán','Morelia','Puerto Rico','San José del Fragua','San Vicente del Caguán','Solano','Solita','Valparaíso'],
 'BOGOTÁ D.C.':['Bogotá'], 'ANTIOQUIA':['Medellín','Envigado','Bello','Itagüí','Rionegro'],
 'CUNDINAMARCA':['Soacha','Chía','Zipaquirá','Facatativá'], 'ATLÁNTICO':['Barranquilla','Soledad'],
 'BOLÍVAR':['Cartagena','Magangué'], 'RISARALDA':['Pereira','Dosquebradas'], 'CALDAS':['Manizales'],
 'QUINDÍO':['Armenia'], 'CAUCA':['Popayán','Santander de Quilichao'], 'META':['Villavicencio'],
 'NARIÑO':['Pasto','Ipiales','Túquerres','Tumaco','La Unión','Samaniego'], 'HUILA':['Acevedo','Agrado','Aipe','Algeciras','Altamira','Baraya','Campoalegre','Colombia','Elías','Garzón','Gigante','Guadalupe','Hobo','Íquira','Isnos','La Argentina','La Plata','Nátaga','Neiva','Oporapa','Paicol','Palermo','Palestina','Pital','Pitalito','Rivera','Saladoblanco','San Agustín','Santa María','Suaza','Tarqui','Tello','Teruel','Tesalia','Timaná','Villavieja','Yaguará'], 'SANTANDER':['Bucaramanga','Floridablanca'],
 'NORTE DE SANTANDER':['Cúcuta','Los Patios'], 'TOLIMA':['Ibagué','Espinal']
}

// Listas locales para ayuda de búsqueda. En el modo demo se puede escribir
// cualquier municipio que aún no esté en esta lista. La fuente oficial de
// municipios y códigos DANE será provista por FastAPI al integrar el backend.

// Cobertura de sugerencias para todos los departamentos; el componente permite
// agregar municipios que no aparezcan aquí sin alterar la lista de departamentos.
const capitalsAndExamples = {
 'AMAZONAS':['Leticia','Puerto Nariño'],
 'ARAUCA':['Arauca','Arauquita','Cravo Norte','Fortul','Puerto Rondón','Saravena','Tame'],
 'BOYACÁ':['Tunja','Duitama','Sogamoso','Chiquinquirá','Villa de Leyva'],
 'CASANARE':['Yopal','Aguazul','Villanueva','Paz de Ariporo'],
 'CESAR':['Valledupar','Aguachica','Bosconia','Codazzi'],
 'CHOCÓ':['Quibdó','Istmina','Acandí','Nuquí'],
 'CÓRDOBA':['Montería','Cereté','Lorica','Sahagún'],
 'GUAINÍA':['Inírida'],
 'GUAVIARE':['San José del Guaviare','Calamar','El Retorno','Miraflores'],
 'LA GUAJIRA':['Riohacha','Maicao','Uribia','Manaure'],
 'MAGDALENA':['Santa Marta','Ciénaga','Fundación','Aracataca'],
 'PUTUMAYO':['Mocoa','Colón','Orito','Puerto Asís','Puerto Caicedo','Puerto Guzmán','Puerto Leguízamo','San Francisco','San Miguel','Santiago','Sibundoy','Valle del Guamuez','Villagarzón'],
 'SAN ANDRÉS Y PROVIDENCIA':['San Andrés','Providencia'],
 'SUCRE':['Sincelejo','Corozal','Sampués','Tolú'],
 'VAUPÉS':['Mitú','Carurú','Taraira'],
 'VICHADA':['Puerto Carreño','Cumaribo','La Primavera','Santa Rosalía'],
}
for (const [dept, cities] of Object.entries(capitalsAndExamples)) {
  if (!citiesByDepartment[dept]) citiesByDepartment[dept] = cities
}
