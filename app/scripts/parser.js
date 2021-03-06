var indexingFactors = require("scripts/indexingFactors");
var currency = require("scripts/currency");
var printer = require("scripts/printer");
var age;
var salary;

PDFJS.disableWorker = true;
// console.log("blah",document.getElementsByTagName('head')[0]);
//PDFJS.workerSrc = 'pdf.worker.js';

function parseEarnings(textArray, index){
  var earnings = [];
  //Dont loop more than 100 times since if they ever change the pdf we dont want an infinite loop.
  for (var i = 0; i < 100; i++) {
    var tempIndex = index+(i*3);
    console.log("parsing item: ", textArray[tempIndex+1].str);
    earnings.push({
      year: parseInt(textArray[tempIndex].str),
      ssEarnings: new currency(textArray[tempIndex+1].str.replace(",","")),
      medEarnings: new currency(textArray[tempIndex+2].str.replace(",",""))
      // ssEarnings: textArray[tempIndex+1].str,
      // medEarnings: textArray[tempIndex+2].str
    });
    if (textArray[tempIndex+3].str === "You and your family may be eligible for valuable"){
      break;
    }
  }
  return earnings;
}

function inflateEarnings(earnings){
  var baseWageIndexYear = 2012;
  if (age >= 60){
    baseWageIndexYear = 2014 - (age-60);
  }
  var baseWageIndexAmt = indexingFactors[baseWageIndexYear];
  for (var i = 0; i < earnings.length; i++) {
    var curYearEarn = earnings[i];
    if (curYearEarn.year >= 2012 || curYearEarn.year >= baseWageIndexYear){
      curYearEarn.inflationPercent = 1;
      curYearEarn.inflatedEarnings = curYearEarn.ssEarnings;
    } else {
      curYearEarn.inflationCalc = baseWageIndexAmt + "("+ baseWageIndexYear +") / " + indexingFactors[curYearEarn.year] + "(" + curYearEarn.year + ")";
      curYearEarn.inflationPercent = new BigNumber(baseWageIndexAmt.div(indexingFactors[curYearEarn.year]));
      curYearEarn.inflatedEarnings = curYearEarn.ssEarnings.times(curYearEarn.inflationPercent);
    }
  }
}

function sortEarningsByAmount(earnings){
  return earnings.sort(function(a, b){
    var cmp = b.inflatedEarnings.cmp(a.inflatedEarnings);
    if (cmp === 0){
      return new BigNumber(b.year).cmp(new BigNumber(a.year));
    }
    return cmp;
  });
}

function sortEarningsByYear(earnings){
  return earnings.sort(function(a, b){
    return new BigNumber(b.year).cmp(new BigNumber(a.year));
  });
}

function projectEarnings(earnings){
  //for every year up to age 65 add cur salary
  for (var i = age; i < 65; i++) {
    earnings.push({
      year: 2014 + (i-age),
      ssEarnings: salary,
      medEarnings: salary
    });
  }
  return earnings;
}

function markTopYears(earnings){
  earnings = sortEarningsByAmount(earnings);
  for (var i = 0; i < 35; i++) {
    if (earnings[i]){
      earnings[i].isTopYear = true;
    }
  }
  return earnings;
}

function getTopYearAverage(earnings){
  var total = new currency(0);

  for (var i = 0; i < earnings.length; i++) {
    var curYearEarn = earnings[i];
    if (curYearEarn.isTopYear){
      total = total.plus(curYearEarn.inflatedEarnings);
    }
  }
  console.log("average of top 35 years: ", total.div(35).toString());
  return total.div(35);
}

function calculateBenefit(avgYear){
  var avgMonth = avgYear.div(12);

  if (avgMonth.lessThanOrEqualTo(new currency(816))){
    return avgMonth.times(".9");
  } else if (avgMonth.lessThan(new currency(4917))){
    return new currency("734.40").plus(avgMonth.minus(816).times(".32"));
  } else {
    return new currency("2046.72").plus(avgMonth.minus(4917).times(".15"));
  }
}

function handleFileSelect(evt) {
  try {
    var files = evt.target.files; // FileList object
    var reader = new FileReader();

    // Closure to capture the file information.
    reader.onload = (function(theFile) {
      try {
        return function(e) {
          PDFJS.getDocument(e.target.result).then(function getPdfHelloWorld(pdf) {
            //
            // Fetch the third page since thats where earning are
            //
            pdf.getPage(3).then(function getPageHelloWorld(page) {
              var scale = 1.5;
              var viewport = page.getViewport(scale);

              page.getTextContent().then( function(textContent){
                console.log(textContent);
                var earnings = [];
                for (var j = 0; j <= textContent.items.length; j++) {
                  var item = textContent.items[j];
                  if (item.str === "Medicare" && textContent.items[j+1].str === "Earnings"){
                      try {
                        age = $("#age").val();
                        salary = new currency($("#salary").val());
                        //make sure the user doesn't get credit for any amount over 117K
                        if (salary.greaterThan(117000)){
                          salary = new currency(117000);
                        }
                        console.log("found earning starting at item: ", j);
                        earnings = parseEarnings(textContent.items, j+2);
                        projectEarnings(earnings);
                        inflateEarnings(earnings);
                        markTopYears(earnings);
                        console.log("earnings", earnings);
                        var avg = getTopYearAverage(earnings);
                        var fullRetAgeBenefit = calculateBenefit(avg);
                        printer.printBenefit(fullRetAgeBenefit, avg);
                        printer.printEarnings(earnings);
                      }
                      catch(err){
                        console.error("Error on parse: ",err);
                      }
                    break;
                  }
                }
              });

              //
              // Prepare canvas using PDF page dimensions
              //
              var canvas = document.getElementById('the-canvas');
              var context = canvas.getContext('2d');
              canvas.height = viewport.height;
              canvas.width = viewport.width;

              //
              // Render PDF page into canvas context
              //
              var renderContext = {
                canvasContext: context,
                viewport: viewport
              };
              page.render(renderContext);
            });
          });
        };
      }
      catch(err){
        console.error("Error on load: ",err);
      }
    })(files[0]);

    reader.readAsArrayBuffer(files[0]);
  }
  catch(err){
    console.log("Error: ",err);
  }
}

document.getElementById('files').addEventListener('change', handleFileSelect, false);
document.getElementById('files').addEventListener('click', handleFileSelect, false);

//Some default values
$("#age").val("34");
$("#salary").val("72000");
